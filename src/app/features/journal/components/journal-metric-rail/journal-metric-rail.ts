import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { UiMetric } from '@shared/components/ui-metric/ui-metric';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { formatMetric, type MetricUnit } from '@shared/utils/metric-format';
import { metricByKey, type JournalOverview, type MetricKey } from '@domain/journal/overview';
import { JournalOverviewService } from '../../data-access/journal-overview.service';

/** Presentation for each key the endpoint returns. Order is the rail's order. */
const RAIL: readonly { key: MetricKey; label: string; unit: MetricUnit }[] = [
  { key: 'desk_minutes', label: 'Desk time', unit: 'minutes' },
  { key: 'commits', label: 'Commits', unit: 'count' },
  { key: 'projects_touched', label: 'Projects touched', unit: 'count' },
  { key: 'focus_sessions', label: 'Focus sessions', unit: 'count' },
];

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Explicit rather than overloading null and undefined — the three states read
 *  differently on screen and the distinction is easy to invert by accident. */
type RailState =
  | { status: 'pending' }
  | { status: 'ready'; data: JournalOverview }
  | { status: 'failed' };

interface RailTile {
  key: MetricKey;
  label: string;
  unit: MetricUnit;
  value: number | null;
  previousValue: number | null;
  baselineValue: number | null;
  baselineLabel: string;
  baselineNote: string | null;
  cumulative: string;
  series: readonly number[];
}

/**
 * The day's work in four numbers, each carrying what it should be measured
 * against.
 *
 * This is the page's answer to "is today normal", and the reason it replaced a
 * row of counters: `0 focus sessions` is a blank, while the same zero beside a
 * typical Tuesday's five is a finding. Nothing here computes a comparison —
 * the endpoint does, so a briefing quoting these figures cannot disagree with
 * the screen.
 */
@Component({
  selector: 'app-journal-metric-rail',
  imports: [UiMetric, UiSubhead],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="metric-rail">
      <app-ui-subhead label="The numbers" [meta]="qualifier()" />

      @if (failed()) {
        <p class="metric-rail__status">Couldn't load today's comparisons.</p>
      } @else {
        <div class="metric-rail__grid" [class.metric-rail__grid--pending]="pending()">
          @for (tile of tiles(); track tile.key) {
            <app-ui-metric
              [label]="tile.label"
              [value]="tile.value"
              [unit]="tile.unit"
              [previousValue]="tile.previousValue"
              [previousLabel]="previousLabel()"
              [baselineValue]="tile.baselineValue"
              [baselineLabel]="tile.baselineLabel"
              [baselineNote]="tile.baselineNote"
              [cumulative]="tile.cumulative"
              [series]="tile.series"
              [absentNote]="pending() ? 'loading…' : null" />
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .metric-rail__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    // Dim rather than unmount: the tiles keep their footprint across a date
    // change, so the page does not jump while the comparisons resolve.
    .metric-rail__grid--pending { opacity: 0.55; }

    .metric-rail__status {
      margin: 0.5rem 0 0;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
  `],
})
export class JournalMetricRail {
  readonly date = input.required<string>();

  private readonly service = inject(JournalOverviewService);

  // Same rxjs-interop shape as the sibling sections: a required input read
  // eagerly by a resource would fire before the input is bound.
  private readonly state = toSignal(
    toObservable(this.date).pipe(
      switchMap(date =>
        this.service.overview(date).pipe(
          map((data): RailState => ({ status: 'ready', data })),
          catchError(() => of<RailState>({ status: 'failed' })),
          // Re-enter pending on every date change, so a slow fetch never shows
          // the previous day's figures under the new day's heading.
          startWith<RailState>({ status: 'pending' }),
        ),
      ),
    ),
    { initialValue: { status: 'pending' } as RailState },
  );

  private readonly overview = computed(() => {
    const s = this.state();
    return s.status === 'ready' ? s.data : null;
  });

  protected readonly failed = computed(() => this.state().status === 'failed');
  protected readonly pending = computed(() => this.state().status === 'pending');

  /** True while a live day is still running — every comparison is truncated. */
  private readonly asOf = computed(() => this.overview()?.as_of ?? null);

  /**
   * Said once, above the rail, rather than repeated on every delta line.
   * The reader needs to know the comparisons are clipped to the same point in
   * the day; they do not need to be told four times.
   */
  protected readonly qualifier = computed(() => {
    const asOf = this.asOf();
    if (!asOf) return 'against yesterday and a typical day';
    const time = new Date(asOf).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `against the same point yesterday and on a typical day — measured to ${time}`;
  });

  protected readonly previousLabel = computed(() => 'yesterday');

  protected readonly tiles = computed<RailTile[]>(() => {
    const overview = this.overview();
    const weekday = overview ? WEEKDAY_SHORT[overview.weekday] : null;
    const baselineLabel = weekday ? `typical ${weekday}` : 'typical';

    return RAIL.map(spec => {
      const metric = metricByKey(overview ?? undefined, spec.key);
      const min = overview?.baseline.min_samples ?? 0;

      return {
        ...spec,
        // Absent until the payload lands — a placeholder zero would be a claim.
        value: metric?.value ?? null,
        previousValue: metric?.prev_day?.value ?? null,
        baselineValue: metric?.baseline?.value ?? null,
        baselineLabel,
        baselineNote: metric && !metric.baseline
          ? `no ${baselineLabel} yet · needs ${min}`
          : null,
        cumulative: metric
          ? `week to date · ${formatMetric(metric.cumulative.week_to_date, spec.unit)}`
          : '',
        series: metric?.series ?? [],
      };
    });
  });
}
