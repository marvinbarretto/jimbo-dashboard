import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { formatMinutes, pluralise } from '@shared/utils/datetime.utils';
import { environment } from '../../../../../environments/environment';
import { PROJECTS_READ } from '../../../projects/data-access/projects.read';
import type {
  DayAggregate,
  DayStream,
  Moment,
  MomentCategory,
  Signal,
} from '@domain/day-stream/day-stream';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

/**
 * Category drives colour and grouping, not `kind` — a reader scanning the day
 * wants to see "body" and "work" as bands, and new kinds arriving from a new
 * server-side source must land somewhere sensible without a UI change.
 */
const CATEGORY_TONE: Record<MomentCategory, Tone> = {
  work: 'accent',
  body: 'success',
  state: 'info',
  consumption: 'warning',
  fleet: 'neutral',
  schedule: 'info',
  vault: 'neutral',
};

/**
 * Fleet moments are excluded by default.
 *
 * On a normal day the fleet contributes more moments than everything else
 * combined (39 dispatch transitions against 44 human ones), and a log of what
 * the agents did drowns the record of what Marvin did. It stays one toggle
 * away rather than being dropped.
 */
const NOISY_CATEGORIES: readonly MomentCategory[] = ['fleet'];

interface StreamRow {
  readonly key: string;
  readonly time: string;
  readonly timeEnd: string | null;
  readonly category: MomentCategory;
  readonly tone: Tone;
  readonly kind: string;
  readonly title: string;
  readonly detail: string | null;
  readonly projectName: string | null;
  readonly magnitude: string | null;
  /** Commits belonging to the session directly above, rendered indented. */
  readonly commits: readonly string[];
}

const hhmm = (iso: string) => iso.slice(11, 16);

/**
 * The day as a chronological log — every source, one column, in order.
 *
 * The journal already has a lane-based timeline, which answers "what was
 * running when". This answers the different question of "what happened, in
 * order" — closer to reading a commit log than a Gantt chart, and the only
 * view where a mood drop sits directly beneath the session that caused it.
 *
 * Reads `/api/journal/day-stream`, which owns the registry of sources. This
 * component deliberately knows nothing about which sources exist: it renders
 * whatever arrives, so a signal added server-side appears here for free.
 */
@Component({
  selector: 'app-journal-day-stream-section',
  imports: [UiBadge, UiEmptyState, UiLoadingState, UiSection, UiStack, UiStatCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-day-stream-section.html',
  styleUrl: './journal-day-stream-section.scss',
})
export class JournalDayStreamSection {
  private readonly projects = inject(PROJECTS_READ);

  /** Logical day key (YYYY-MM-DD). */
  readonly date = input.required<string>();

  private readonly resource = httpResource<DayStream>(() =>
    `${environment.dashboardApiUrl}/api/journal/day-stream?date=${this.date()}`);

  protected readonly loading = computed(() => this.resource.isLoading());
  protected readonly failed = computed(() => !!this.resource.error());
  protected readonly stream = computed<DayStream | null>(() =>
    this.resource.hasValue() ? this.resource.value() : null);

  protected readonly showFleet = signal(false);

  protected readonly moments = computed<readonly Moment[]>(() => this.stream()?.moments ?? []);

  private readonly visibleMoments = computed(() => {
    const all = this.moments();
    return this.showFleet()
      ? all
      : all.filter(m => !NOISY_CATEGORIES.includes(m.category));
  });

  /**
   * Commits are folded into the session that produced them rather than listed
   * as peers — seven identical timestamps in a row reads as noise, not history.
   *
   * Two anchoring rules, because the endpoint unions two producers:
   *
   * - `via: 'code_session'` commits carry no timestamp of their own; the server
   *   anchors them to their session's start, so they match by exact instant.
   * - `via: 'github_push'` commits carry a real `author_date`, which will match
   *   no session start. They fold into whichever work span contains them.
   *
   * The second rule is dormant today — the push poller has been down since
   * 2026-08-13, so every commit currently arrives by the first route. It is
   * here because the day the token is replaced is precisely the day exact-match
   * folding would silently drop every commit on the page.
   *
   * Anything that matches neither becomes its own row. A commit is never
   * dropped for failing to find a parent.
   */
  protected readonly rows = computed<readonly StreamRow[]>(() => {
    const visible = this.visibleMoments();
    const commits = visible.filter(m => m.kind === 'commit');
    const spans = visible.filter(m => m.kind !== 'commit');

    const adopted = new Map<Moment, string[]>();
    const orphans: Moment[] = [];

    for (const c of commits) {
      // Only a work span can own a commit; a walk sharing an instant must not
      // adopt one.
      const candidates = spans.filter(s => s.category === 'work');
      const parent = c.meta['via'] === 'code_session'
        ? candidates.find(s => s.ts === c.ts)
        : candidates.find(s => {
            if (!s.ts_end) return false;
            return c.ts >= s.ts && c.ts <= s.ts_end;
          });

      if (!parent) { orphans.push(c); continue; }
      adopted.set(parent, [...(adopted.get(parent) ?? []), c.title]);
    }

    return [...spans, ...orphans]
      .sort((a, b) => a.ts.localeCompare(b.ts))
      .map((m, i) => ({
        key: `${m.source}:${m.ts}:${i}`,
        time: hhmm(m.ts),
        timeEnd: m.ts_end ? hhmm(m.ts_end) : null,
        category: m.category,
        tone: CATEGORY_TONE[m.category] ?? 'neutral',
        kind: m.kind.replace(/_/g, ' '),
        title: m.title,
        detail: m.detail,
        projectName: m.project_id ? this.projectName(m.project_id) : null,
        magnitude: this.magnitude(m),
        commits: adopted.get(m) ?? [],
      }));
  });

  protected readonly aggregates = computed<readonly DayAggregate[]>(() =>
    (this.stream()?.aggregates ?? []).filter(a => a.value !== null));

  protected readonly signals = computed<readonly Signal[]>(() => this.stream()?.signals ?? []);

  /**
   * Broken sources, surfaced rather than tucked into a health panel.
   *
   * The whole reason this endpoint exists is that a dead collector rendered as
   * `0` is indistinguishable from a quiet day, so the one thing this section
   * must never do is hide them.
   */
  protected readonly deadSignals = computed<readonly Signal[]>(() =>
    this.signals().filter(s => s.status === 'dead'));

  protected readonly fleetCount = computed(() =>
    this.moments().filter(m => NOISY_CATEGORIES.includes(m.category)).length);

  protected readonly sectionMeta = computed(() => {
    const s = this.stream();
    if (!s) return '';
    const parts = [pluralise(this.rows().length, 'moment')];
    const dead = this.deadSignals().length;
    if (dead) parts.push(`${dead} dead ${dead === 1 ? 'signal' : 'signals'}`);
    return parts.join(' · ');
  });

  protected readonly open = linkedSignal(() => this.rows().length > 0);

  private magnitude(m: Moment): string | null {
    if (m.value === null) return null;
    if (m.unit === 'minutes') return formatMinutes(m.value);
    return m.unit ? `${m.value} ${m.unit}` : String(m.value);
  }

  protected formatAggregate(a: DayAggregate): string {
    if (a.value === null) return '—';
    return a.unit && a.unit !== 'notes' ? `${a.value} ${a.unit}` : String(a.value);
  }

  protected staleLabel(s: Signal): string {
    if (s.stale_days === null) return 'never produced';
    return `${s.stale_days}d silent`;
  }

  private projectName(id: string): string {
    return this.projects.getById(id)?.display_name ?? id;
  }
}
