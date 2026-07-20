import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Chip } from '@shared/components/chip/chip';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { absoluteTime } from '@shared/utils/datetime.utils';
import { type DayKey, dateFromDayKey, shiftDay, todayKey } from '@shared/utils/date-keys';
import { catchError, map, of, switchMap, timer } from 'rxjs';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import {
  CodeSessionsService,
  type CodeSession,
} from '../../data-access/code-sessions.service';
import type {
  CalendarEventLite,
  FocusSessionLite,
  TelemetryEventLite,
} from '../../data-access/journal-data.service';
import {
  assignColumns,
  calendarIntervals,
  codeIntervals,
  commitPins,
  exerciseIntervals,
  focusIntervals,
  timelineWindow,
  youtubeEpisodes,
  type RetroInterval,
  type RetroLane,
  type RetroSource,
} from '../../utils/retro-timeline';

const PX_PER_HOUR = 48;
const HOUR_MS = 3_600_000;

const LANES: readonly { key: RetroLane; label: string }[] = [
  { key: 'plan', label: 'Plan' },
  { key: 'desk', label: 'Desk' },
  { key: 'watching', label: 'Watching' },
  { key: 'body', label: 'Body' },
];

const SOURCE_LABEL: Record<RetroSource, string> = {
  calendar: 'Calendar',
  focus: 'Pomos',
  code: 'Code',
  youtube: 'YouTube',
  exercise: 'Exercise',
};

interface BlockVM {
  readonly id: string;
  readonly source: RetroSource;
  readonly topPx: number;
  readonly heightPx: number;
  readonly leftPct: number;
  readonly widthPct: number;
  readonly label: string;
  readonly tooltip: string;
}

interface PinVM {
  readonly id: string;
  readonly topPx: number;
  readonly count: number;
  readonly tooltip: string;
}

interface HourTick {
  readonly topPx: number;
  readonly label: string;
}

@Component({
  selector: 'app-journal-timeline-section',
  imports: [Chip, UiEmptyState, UiSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-timeline-section.html',
  styleUrl: './journal-timeline-section.scss',
})
export class JournalTimelineSection {
  private readonly codeSessions = inject(CodeSessionsService);
  private readonly projects = inject(ProjectsService);

  readonly date = input.required<DayKey>();
  readonly sessions = input.required<readonly FocusSessionLite[]>();
  readonly events = input.required<readonly CalendarEventLite[]>();
  readonly telemetry = input.required<readonly TelemetryEventLite[]>();

  // One clock for the whole section: drives the now-line and the open end of
  // a still-running code session. 60s resolution is plenty at 48px/hour.
  private readonly nowMs = toSignal(
    timer(0, 60_000).pipe(map(() => Date.now())),
    { initialValue: Date.now() },
  );

  // Code sessions come from their own endpoint rather than the day bundle;
  // fetched here with the same local-midnight window as the sessions section.
  private readonly codeResult = toSignal(
    toObservable(this.date).pipe(
      switchMap((date) => timer(0, 60_000).pipe(
        switchMap(() => this.codeSessions.list({
          since: dateFromDayKey(date).toISOString(),
          until: dateFromDayKey(shiftDay(date, 1)).toISOString(),
        }).pipe(catchError(() => of({ items: [] as CodeSession[] })))),
      )),
    ),
    { initialValue: null },
  );

  private readonly hidden = signal<ReadonlySet<RetroSource>>(new Set());

  private readonly allIntervals = computed<RetroInterval[]>(() => [
    ...calendarIntervals(this.events()),
    ...focusIntervals(this.sessions(), id => this.projectName(id)),
    ...codeIntervals(this.codeResult()?.items ?? [], this.nowMs()),
    ...youtubeEpisodes(this.telemetry()),
    ...exerciseIntervals(this.telemetry()),
  ]);

  private readonly pins = computed(() => commitPins(this.telemetry()));

  readonly sourceChips = computed(() => {
    const counts = new Map<RetroSource, number>();
    for (const iv of this.allIntervals()) {
      counts.set(iv.source, (counts.get(iv.source) ?? 0) + 1);
    }
    const hidden = this.hidden();
    return (Object.keys(SOURCE_LABEL) as RetroSource[])
      .filter(s => (counts.get(s) ?? 0) > 0)
      .map(s => ({
        source: s,
        label: SOURCE_LABEL[s],
        count: counts.get(s) ?? 0,
        active: !hidden.has(s),
      }));
  });

  readonly commitCount = computed(() => this.pins().reduce((s, p) => s + p.count, 0));

  private readonly visibleIntervals = computed(() => {
    const hidden = this.hidden();
    return this.allIntervals().filter(iv => !hidden.has(iv.source));
  });

  // Window fits ALL of the day's data (not just visible) so toggling a layer
  // filters content without the whole grid re-anchoring under the cursor.
  private readonly window = computed(() =>
    timelineWindow(dateFromDayKey(this.date()).getTime(), this.allIntervals(), this.pins()));

  readonly gridHeightPx = computed(() => {
    const w = this.window();
    return ((w.endMs - w.startMs) / HOUR_MS) * PX_PER_HOUR;
  });

  readonly hourTicks = computed<HourTick[]>(() => {
    const w = this.window();
    return w.hours.map((h, i) => ({
      topPx: i * PX_PER_HOUR,
      label: `${h.toString().padStart(2, '0')}:00`,
    }));
  });

  readonly lanes = computed(() => {
    const w = this.window();
    const byLane = new Map<RetroLane, RetroInterval[]>();
    for (const iv of this.visibleIntervals()) {
      // Clamp to the window (a code session can run past midnight); drop
      // anything that clamps away entirely.
      const startMs = Math.max(iv.startMs, w.startMs);
      const endMs = Math.min(iv.endMs, w.endMs);
      if (endMs <= startMs) continue;
      const list = byLane.get(iv.lane) ?? [];
      list.push({ ...iv, startMs, endMs });
      byLane.set(iv.lane, list);
    }
    return LANES.map(lane => ({
      ...lane,
      blocks: assignColumns(byLane.get(lane.key) ?? []).map<BlockVM>(iv => ({
        id: iv.id,
        source: iv.source,
        topPx: ((iv.startMs - w.startMs) / HOUR_MS) * PX_PER_HOUR,
        heightPx: Math.max(((iv.endMs - iv.startMs) / HOUR_MS) * PX_PER_HOUR, 14),
        leftPct: (iv.col / iv.cols) * 100,
        widthPct: (1 / iv.cols) * 100,
        label: iv.label,
        tooltip: `${absoluteTime(new Date(iv.startMs).toISOString())}–${absoluteTime(new Date(iv.endMs).toISOString())} · ${iv.label}${iv.detail ? ` · ${iv.detail}` : ''}`,
      })),
    }));
  });

  readonly pinVMs = computed<PinVM[]>(() => {
    const w = this.window();
    return this.pins()
      .filter(p => p.tsMs >= w.startMs && p.tsMs <= w.endMs)
      .map(p => ({
        id: p.id,
        topPx: ((p.tsMs - w.startMs) / HOUR_MS) * PX_PER_HOUR,
        count: p.count,
        tooltip: `${absoluteTime(new Date(p.tsMs).toISOString())} · ${p.items.join('\n')}`,
      }));
  });

  // Now-line only on today's page, and only when "now" falls inside the window.
  readonly nowLineTopPx = computed<number | null>(() => {
    if (this.date() !== todayKey()) return null;
    const w = this.window();
    const now = this.nowMs();
    if (now < w.startMs || now > w.endMs) return null;
    return ((now - w.startMs) / HOUR_MS) * PX_PER_HOUR;
  });

  readonly hasAnything = computed(() => this.allIntervals().length > 0 || this.pins().length > 0);
  readonly open = linkedSignal(() => this.hasAnything());

  readonly sectionMeta = computed(() => {
    const n = this.allIntervals().length;
    const c = this.commitCount();
    if (!n && !c) return 'nothing captured';
    const parts: string[] = [];
    if (n) parts.push(`${n} blocks`);
    if (c) parts.push(`${c} commits`);
    return parts.join(' · ');
  });

  toggleSource(source: RetroSource): void {
    this.hidden.update(hidden => {
      const next = new Set(hidden);
      if (next.has(source)) next.delete(source); else next.add(source);
      return next;
    });
  }

  private projectName(id: string | null): string {
    if (!id) return 'Focus';
    return this.projects.getById(id)?.display_name ?? 'Focus';
  }
}
