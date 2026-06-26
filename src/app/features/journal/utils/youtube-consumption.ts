// Aggregates YouTube watch-segment telemetry into a day's "consumption" picture:
// per-video totals (segments summed), per-channel rollups, and a local-hour
// histogram. Pure + unit-tested; the section component is a thin renderer over this.
//
// The data is the `youtube`/`watch_session` events the journal already pulls into
// the day bundle. Each segment is a slice of one video actually watched (≥2s),
// with { videoId, title, channel, url } in payload and seconds in `value`.

import type { TelemetryEventLite } from '../data-access/journal-data.service';

const YOUTUBE_COLLECTOR = 'youtube';
const WATCH_TYPE = 'watch_session';

/** Channel label used when a segment never captured the uploader (e.g. a glance). */
export const UNKNOWN_CHANNEL = 'Unknown channel';

/** Server-side per-day fetch cap (mirrors journal-data.service). At/above this the
 *  day's totals undercount, so the UI hedges rather than claiming an exact figure. */
export const SEGMENT_FETCH_CAP = 500;

export interface WatchedVideo {
  readonly videoId: string;
  readonly title: string;
  readonly channel: string | null;
  readonly url: string | null;
  readonly seconds: number;
  readonly segments: number;
  readonly firstTs: string;
  readonly lastTs: string;
}

export interface WatchedChannel {
  readonly channel: string;
  readonly seconds: number;
  readonly videos: number;
}

export interface YouTubeConsumption {
  readonly totalSeconds: number;
  readonly videoCount: number;
  readonly channelCount: number;
  /** Most-watched first. */
  readonly videos: readonly WatchedVideo[];
  /** Most-watched first. */
  readonly channels: readonly WatchedChannel[];
  /** Length 24, local-hour buckets in minutes. */
  readonly minutesByHour: readonly number[];
  /** Raw segment count behind this summary — used to detect the fetch cap. */
  readonly segmentCount: number;
  readonly capped: boolean;
}

// Titles that leaked before the extension's title-resolution fix, plus the shells
// YouTube shows before the watch-page <h1> mounts. Any real title beats these.
export function isPlaceholderTitle(title: string | null | undefined): boolean {
  if (!title) return true;
  const t = title.trim();
  if (!t || t === 'YouTube') return true;
  // "(3) YouTube", "(2566) YouTube" — the notification-count tab title, no <h1> yet.
  return /^\(\d+\)\s*YouTube$/i.test(t);
}

// Pick the better of two titles for the same video: a real title always beats a
// placeholder; between two real ones the longer (more complete) wins. Without this
// a video opened cold could be labelled by its "(2566) YouTube" placeholder even
// though a later segment captured the real title.
function betterTitle(a: string | null, b: string | null): string | null {
  const aPlace = isPlaceholderTitle(a);
  const bPlace = isPlaceholderTitle(b);
  if (aPlace && bPlace) return a ?? b;
  if (aPlace) return b;
  if (bPlace) return a;
  return b!.length > a!.length ? b : a;
}

interface VideoAccum {
  videoId: string;
  title: string | null;
  channel: string | null;
  url: string | null;
  seconds: number;
  segments: number;
  firstTs: string;
  lastTs: string;
}

function str(payload: Record<string, unknown> | null, key: string): string | null {
  const v = payload?.[key];
  return typeof v === 'string' ? v : null;
}

export function summariseYouTube(events: readonly TelemetryEventLite[]): YouTubeConsumption {
  const segments = events.filter(
    (e) => e.collector === YOUTUBE_COLLECTOR && e.type === WATCH_TYPE,
  );

  const byVideo = new Map<string, VideoAccum>();
  const minutesByHour = new Array<number>(24).fill(0);

  for (const e of segments) {
    const videoId = str(e.payload, 'videoId');
    const title = str(e.payload, 'title');
    const channel = str(e.payload, 'channel');
    const url = str(e.payload, 'url');
    const seconds = e.value ?? 0;

    // Local hour: youtube events are fetched on local-midnight day boundaries, and
    // this is personal viewing — UTC bucketing would shift every watch by the
    // user's offset (the Phone section, the right sibling, also uses local hours).
    const hour = new Date(e.ts).getHours();
    if (hour >= 0 && hour < 24) minutesByHour[hour] += seconds / 60;

    // Group by videoId; fall back to url then event id so a malformed segment still
    // counts toward totals without merging into an unrelated video.
    const key = videoId ?? url ?? e.id;
    const acc = byVideo.get(key);
    if (acc) {
      acc.seconds += seconds;
      acc.segments += 1;
      acc.title = betterTitle(acc.title, title);
      acc.channel ??= channel;
      acc.url ??= url;
      if (e.ts < acc.firstTs) acc.firstTs = e.ts;
      if (e.ts > acc.lastTs) acc.lastTs = e.ts;
    } else {
      byVideo.set(key, {
        videoId: videoId ?? key,
        title,
        channel,
        url,
        seconds,
        segments: 1,
        firstTs: e.ts,
        lastTs: e.ts,
      });
    }
  }

  const videos: WatchedVideo[] = [...byVideo.values()]
    .map((v) => ({
      videoId: v.videoId,
      title: isPlaceholderTitle(v.title) ? 'Untitled video' : v.title!,
      channel: v.channel,
      url: v.url,
      seconds: Math.round(v.seconds),
      segments: v.segments,
      firstTs: v.firstTs,
      lastTs: v.lastTs,
    }))
    .sort((a, b) => b.seconds - a.seconds);

  const byChannel = new Map<string, { seconds: number; videos: number }>();
  for (const v of videos) {
    const label = v.channel?.trim() || UNKNOWN_CHANNEL;
    const b = byChannel.get(label) ?? { seconds: 0, videos: 0 };
    b.seconds += v.seconds;
    b.videos += 1;
    byChannel.set(label, b);
  }
  const channels: WatchedChannel[] = [...byChannel.entries()]
    .map(([channel, b]) => ({ channel, seconds: b.seconds, videos: b.videos }))
    .sort((a, b) => b.seconds - a.seconds);

  return {
    totalSeconds: videos.reduce((s, v) => s + v.seconds, 0),
    videoCount: videos.length,
    channelCount: channels.length,
    videos,
    channels,
    minutesByHour: minutesByHour.map((m) => Math.round(m)),
    segmentCount: segments.length,
    capped: segments.length >= SEGMENT_FETCH_CAP,
  };
}
