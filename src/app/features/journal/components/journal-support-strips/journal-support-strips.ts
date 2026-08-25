import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiMetric } from '@shared/components/ui-metric/ui-metric';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import type { MetricUnit } from '@shared/utils/metric-format';
import type { DayAggregate, Moment, Signal } from '@domain/day-stream/day-stream';
import { JournalDayStreamService } from '../../data-access/journal-day-stream.service';

interface StripTile {
  readonly id: string;
  readonly label: string;
  readonly value: number | null;
  readonly unit: MetricUnit;
  readonly detail: string | null;
  readonly absentNote: string | null;
  readonly higherIsBetter: boolean;
}

/**
 * Everything that is not the work headline, at the weight it deserves.
 *
 * Two strips, both half the size of the metric rail. That size ratio *is* the
 * page's editorial position made structural: this is a work-first day view, so
 * body and fleet data support rather than compete, and anything wanting more
 * room lives on the tab that owns it.
 *
 * Read entirely from the day-stream registry, which is why a signal added
 * server-side turns up here without a change on this side. Deliberately
 * without comparisons: the baselines live in `/api/journal/overview`, which
 * covers the four work metrics only, and inventing a client-side baseline for
 * these would be the exact drift that endpoint exists to prevent.
 */
@Component({
  selector: 'app-journal-support-strips',
  imports: [RouterLink, UiMetric, UiSubhead],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="strips">
      <div class="strips__group">
        <app-ui-subhead label="Body & attention" [meta]="bodyMeta()" />
        <div class="strips__grid">
          @for (t of body(); track t.id) {
            <app-ui-metric
              [compact]="true"
              [label]="t.label"
              [value]="t.value"
              [unit]="t.unit"
              [cumulative]="t.detail"
              [absentNote]="t.absentNote"
              [higherIsBetter]="t.higherIsBetter" />
          }
        </div>
        <a class="strips__link" [routerLink]="['/journal', 'body', 'day', date()]">Body →</a>
      </div>

      <div class="strips__group">
        <app-ui-subhead label="The fleet" [meta]="fleetMeta()" />
        <div class="strips__grid">
          @for (t of fleet(); track t.id) {
            <app-ui-metric
              [compact]="true"
              [label]="t.label"
              [value]="t.value"
              [unit]="t.unit"
              [cumulative]="t.detail"
              [absentNote]="t.absentNote"
              [higherIsBetter]="t.higherIsBetter" />
          }
        </div>
        <a class="strips__link" [routerLink]="['/journal', 'jimbo', 'day', date()]">Jimbo →</a>
      </div>
    </section>
  `,
  styles: [`
    .strips {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .strips__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.5rem;
    }

    .strips__link {
      display: inline-block;
      margin-top: 0.45rem;
      font-size: 0.7rem;
      color: var(--color-text-muted);
      text-decoration: none;
    }

    .strips__link:hover { color: var(--color-text); }
  `],
})
export class JournalSupportStrips {
  readonly date = input.required<string>();

  private readonly service = inject(JournalDayStreamService);

  private readonly aggregates = computed<readonly DayAggregate[]>(() =>
    this.service.stream()?.aggregates ?? []);
  private readonly moments = computed<readonly Moment[]>(() =>
    this.service.stream()?.moments ?? []);
  private readonly signals = computed<readonly Signal[]>(() =>
    this.service.stream()?.signals ?? []);

  private agg(source: string, key: string): DayAggregate | null {
    return this.aggregates().find(a => a.source === source && a.key === key) ?? null;
  }

  /**
   * Absent is not zero, and the registry is the only thing that knows which is
   * which — a dead collector reports `dead`, and rendering its silence as 0 is
   * how the commit poller went unnoticed for eleven days.
   */
  private tile(
    source: string,
    key: string,
    label: string,
    unit: MetricUnit,
    detail: string | null = null,
    higherIsBetter = true,
  ): StripTile {
    const a = this.agg(source, key);
    const signal = this.signals().find(s => s.id === source);
    const dead = signal?.status === 'dead';
    return {
      id: `${source}.${key}`,
      label,
      value: dead || a === null ? null : a.value,
      unit,
      detail,
      absentNote: dead
        ? `${signal?.label ?? source} not reporting`
        : a === null ? 'no reading' : null,
      higherIsBetter,
    };
  }

  protected readonly body = computed<StripTile[]>(() => [
    this.tile('health', 'steps', 'Steps', 'count'),
    this.tile('health', 'active_calories', 'Active kcal', 'count'),
    this.tile('health', 'distance_km', 'Distance', 'km'),
    this.tile('phone', 'notifications', 'Notifications', 'count', 'interruptions', false),
    {
      id: 'youtube.minutes',
      label: 'YouTube',
      value: this.youtubeMinutes(),
      unit: 'minutes' as const,
      detail: this.youtubeDetail(),
      absentNote: null,
      // Watching more than usual is not an achievement; the arrow must not
      // imply it is.
      higherIsBetter: false,
    },
  ]);

  protected readonly fleet = computed<StripTile[]>(() => {
    const jobs = this.moments().filter(m => m.source === 'dispatch');
    const failed = jobs.filter(m => m.kind === 'job_failed').length;
    const completed = jobs.filter(m => m.kind === 'job_completed').length;
    const mcpErrors = this.agg('mcp', 'errors')?.value ?? 0;

    return [
      {
        id: 'dispatch.completed', label: 'Jobs done', value: completed, unit: 'count' as const,
        detail: jobs.length ? `${Math.round((completed / jobs.length) * 100)}% of ${jobs.length}` : null,
        absentNote: null, higherIsBetter: true,
      },
      {
        id: 'dispatch.failed', label: 'Failures', value: failed, unit: 'count' as const,
        detail: failed ? 'see Jimbo for causes' : 'clean run',
        absentNote: null, higherIsBetter: false,
      },
      this.tile('vault', 'notes_closed', 'Vault closed', 'count', 'notes of every type'),
      this.tile('vault', 'notes_created', 'Vault created', 'count', 'intake'),
      {
        id: 'mcp.calls', label: 'MCP calls', value: this.agg('mcp', 'calls')?.value ?? null,
        unit: 'count' as const,
        detail: mcpErrors ? `${mcpErrors} errored` : 'no errors',
        absentNote: null, higherIsBetter: true,
      },
    ];
  });

  private readonly youtubeMinutes = computed(() => {
    // The registry states each moment's unit; trust it rather than assuming.
    // These arrive as minutes, and treating them as seconds under-reported a
    // six-hour afternoon as seven minutes.
    const videos = this.moments().filter(m => m.source === 'youtube' && m.unit === 'minutes');
    if (videos.length === 0) return null;
    return Math.round(videos.reduce((total, m) => total + (m.value ?? 0), 0));
  });

  private readonly youtubeDetail = computed(() => {
    const count = this.moments().filter(m => m.source === 'youtube').length;
    return count ? `${count} ${count === 1 ? 'video' : 'videos'}` : null;
  });

  /** Names the dead collectors rather than letting their silence read as calm. */
  private deadNote(categories: readonly string[]): string | null {
    const dead = this.signals().filter(s => s.status === 'dead' && categories.includes(s.category));
    return dead.length ? `${dead.map(s => s.label).join(', ')} not reporting` : null;
  }

  protected readonly bodyMeta = computed(() => this.deadNote(['body', 'consumption']));
  protected readonly fleetMeta = computed(() => this.deadNote(['fleet', 'vault']));
}
