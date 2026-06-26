import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import { formatMinutes, pluralise } from '@shared/utils/datetime.utils';
import type { TelemetryEventLite } from '../../data-access/journal-data.service';
import { summariseYouTube, type WatchedChannel, type WatchedVideo } from '../../utils/youtube-consumption';

// Render at most this many video rows; busy days get a "+N more" footer rather
// than an unbounded wall of links.
const MAX_VIDEO_ROWS = 40;

const HOUR_LABELS: readonly string[] = Array.from({ length: 24 }, (_, h) =>
  `${h.toString().padStart(2, '0')}:00`,
);

/**
 * "Consumption" — what was watched today, from the extension's YouTube watch
 * segments (already in the day bundle's telemetry; fed in via [events], no fetch).
 *
 * Today it's YouTube-only; the section name and shape are deliberately source-
 * agnostic so podcasts / articles / other feeds can fold in later. The longer
 * goal is steering consumption toward higher-quality material — the seam for a
 * per-channel/per-video quality signal is marked in the template.
 */
@Component({
  selector: 'app-journal-consumption-section',
  imports: [
    UiBadge,
    UiBarChart,
    UiEmptyState,
    UiSection,
    UiStack,
    UiStatCard,
    UiSubhead,
    UiSubsection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-consumption-section.html',
  styleUrl: './journal-consumption-section.scss',
})
export class JournalConsumptionSection {
  /** The day's telemetry events (the journal bundle already includes youtube). */
  readonly events = input.required<readonly TelemetryEventLite[]>();

  protected readonly summary = computed(() => summariseYouTube(this.events()));

  protected readonly totalMinutes = computed(() =>
    Math.round(this.summary().totalSeconds / 60),
  );

  protected readonly hourLabels = HOUR_LABELS;
  protected readonly hourValues = computed(() => this.summary().minutesByHour);

  // Cap the rendered list; the summary still aggregates over everything.
  protected readonly videoRows = computed(() => this.summary().videos.slice(0, MAX_VIDEO_ROWS));
  protected readonly hiddenVideoCount = computed(() =>
    Math.max(0, this.summary().videoCount - MAX_VIDEO_ROWS),
  );

  protected readonly sectionMeta = computed(() => {
    const s = this.summary();
    if (s.videoCount === 0) return 'nothing watched';
    const base = `${formatMinutes(this.totalMinutes())} · ${pluralise(s.videoCount, 'video')}`;
    return s.capped ? `${base} · capped` : base;
  });

  // Collapse to its header on a no-watch day; stay manually expandable.
  protected readonly open = linkedSignal(() => this.summary().videoCount > 0);

  protected readonly formatMinutes = formatMinutes;

  // Whole-minute label for a per-video duration; sub-minute glances read as "<1m".
  protected videoDuration(v: WatchedVideo): string {
    return v.seconds < 60 ? '<1m' : formatMinutes(Math.round(v.seconds / 60));
  }

  // Channels round to at least 1 minute so a real (if brief) channel never reads "0m".
  protected channelTime(c: WatchedChannel): string {
    return formatMinutes(Math.max(1, Math.round(c.seconds / 60)));
  }
}
