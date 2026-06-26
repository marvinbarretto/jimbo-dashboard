import { describe, expect, it } from 'vitest';
import type { TelemetryEventLite } from '../data-access/journal-data.service';
import {
  isPlaceholderTitle,
  summariseYouTube,
  SEGMENT_FETCH_CAP,
  UNKNOWN_CHANNEL,
} from './youtube-consumption';

// Build a watch_session segment with sensible defaults; override per case.
function seg(over: Partial<{
  id: string;
  ts: string;
  value: number;
  videoId: string | null;
  title: string | null;
  channel: string | null;
  url: string | null;
  collector: string;
  type: string;
}> = {}): TelemetryEventLite {
  // Use `in` so an explicitly-passed null (e.g. channel: null) is preserved
  // rather than swallowed by a `??` default.
  const p = {
    videoId: 'videoId' in over ? over.videoId : 'vid1',
    title: 'title' in over ? over.title : 'A Real Title',
    channel: 'channel' in over ? over.channel : 'Some Channel',
    url: 'url' in over ? over.url : 'https://youtube.com/watch?v=vid1',
  };
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    collector: over.collector ?? 'youtube',
    type: over.type ?? 'watch_session',
    ts: over.ts ?? '2026-06-26T12:00:00.000Z',
    value: over.value ?? 60,
    unit: 'seconds',
    source: 'youtube.com',
    payload: p as Record<string, unknown>,
  };
}

describe('isPlaceholderTitle', () => {
  it('flags empty, "YouTube", and "(N) YouTube" shells', () => {
    expect(isPlaceholderTitle(null)).toBe(true);
    expect(isPlaceholderTitle('')).toBe(true);
    expect(isPlaceholderTitle('   ')).toBe(true);
    expect(isPlaceholderTitle('YouTube')).toBe(true);
    expect(isPlaceholderTitle('(2566) YouTube')).toBe(true);
    expect(isPlaceholderTitle('(3) YouTube')).toBe(true);
  });

  it('treats a real title as resolved', () => {
    expect(isPlaceholderTitle('Should the UK ban X? | LBC')).toBe(false);
  });
});

describe('summariseYouTube', () => {
  it('ignores non-youtube and non-watch events', () => {
    const out = summariseYouTube([
      seg({ collector: 'github', type: 'push' }),
      seg({ collector: 'youtube', type: 'something_else' }),
    ]);
    expect(out.videoCount).toBe(0);
    expect(out.totalSeconds).toBe(0);
    expect(out.segmentCount).toBe(0);
  });

  it('sums segments of the same video into one row', () => {
    // The real "Shaq" case: four segments, 60+60+25+27 = 172s.
    const out = summariseYouTube([
      seg({ videoId: 'shaq', value: 60, ts: '2026-06-26T12:19:24Z' }),
      seg({ videoId: 'shaq', value: 60, ts: '2026-06-26T12:20:42Z' }),
      seg({ videoId: 'shaq', value: 25, ts: '2026-06-26T12:21:42Z' }),
      seg({ videoId: 'shaq', value: 27, ts: '2026-06-26T12:24:44Z' }),
    ]);
    expect(out.videoCount).toBe(1);
    expect(out.videos[0]!.seconds).toBe(172);
    expect(out.videos[0]!.segments).toBe(4);
    expect(out.totalSeconds).toBe(172);
  });

  it('prefers a real title over a placeholder when a video resolved mid-watch', () => {
    const out = summariseYouTube([
      seg({ videoId: 'v', title: '(2566) YouTube', value: 60 }),
      seg({ videoId: 'v', title: 'The Real Video Title', value: 30 }),
    ]);
    expect(out.videos[0]!.title).toBe('The Real Video Title');
  });

  it('keeps a placeholder only when no segment ever resolved, as "Untitled video"', () => {
    const out = summariseYouTube([
      seg({ videoId: 'v', title: '(2566) YouTube', value: 60 }),
    ]);
    expect(out.videos[0]!.title).toBe('Untitled video');
  });

  it('buckets a null channel under Unknown rather than dropping it', () => {
    const out = summariseYouTube([
      seg({ videoId: 'glance', channel: null, value: 2 }),
      seg({ videoId: 'shaq', channel: 'LBC', value: 60 }),
    ]);
    const unknown = out.channels.find((c) => c.channel === UNKNOWN_CHANNEL);
    expect(unknown).toBeDefined();
    expect(unknown!.videos).toBe(1);
    expect(out.channelCount).toBe(2);
  });

  it('rolls up channels and sorts both videos and channels by watch time desc', () => {
    const out = summariseYouTube([
      seg({ videoId: 'a', channel: 'Chan A', value: 30 }),
      seg({ videoId: 'b', channel: 'Chan B', value: 120 }),
      seg({ videoId: 'c', channel: 'Chan B', value: 60 }),
    ]);
    expect(out.videos.map((v) => v.videoId)).toEqual(['b', 'c', 'a']);
    expect(out.channels[0]!.channel).toBe('Chan B');
    expect(out.channels[0]!.seconds).toBe(180);
    expect(out.channels[0]!.videos).toBe(2);
  });

  it('buckets watch minutes by LOCAL hour', () => {
    // 09:30 local in whatever zone the test host runs — assert via the same
    // local accessor rather than hardcoding a zone.
    const ts = '2026-06-26T09:30:00.000Z';
    const localHour = new Date(ts).getHours();
    const out = summariseYouTube([seg({ value: 120, ts })]); // 2 min
    expect(out.minutesByHour[localHour]).toBe(2);
    expect(out.minutesByHour.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it('flags capped when the segment count hits the fetch limit', () => {
    const many = Array.from({ length: SEGMENT_FETCH_CAP }, (_, i) =>
      seg({ id: `e${i}`, videoId: `v${i}`, value: 3 }),
    );
    expect(summariseYouTube(many).capped).toBe(true);
    expect(summariseYouTube(many.slice(0, 10)).capped).toBe(false);
  });
});
