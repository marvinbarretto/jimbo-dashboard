import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';

interface PipelineResponse {
  counts: Record<string, number>;
}

interface Lesson {
  active: boolean;
  hit_count: number | null;
  last_cited_at: string | null;
}

interface Correction {
  id: string;
  created_at: string;
}

const DAY_MS = 86_400_000;
const CITED_WINDOW_DAYS = 30;

/**
 * Health of the grooming pump's learning loop, which is otherwise invisible:
 * the board shows vault items moving through columns, but nothing showed
 * whether the pump was still *learning* from corrections. It had not been —
 * lessons sat inactive and uncited for three months and nobody could tell.
 *
 * Deliberately four numbers, not an admin surface. Proposals/corrections/
 * lessons CRUD isn't worth building until the loop actually turns over.
 */
@Component({
  selector: 'app-grooming-health-strip',
  imports: [UiStatCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ghs">
      <app-ui-stat-card
        label="Ungroomed"
        [value]="ungroomed()"
        [status]="ungroomedStatus()"
        [detail]="ungroomedDetail()"
      />
      <app-ui-stat-card
        label="Awaiting distill"
        [value]="uningested()"
        [status]="uningestedStatus()"
        detail="Corrections not yet turned into lessons"
      />
      <app-ui-stat-card
        label="Active lessons"
        [value]="activeLessons()"
        [status]="activeLessonsStatus()"
        [detail]="lessonsDetail()"
      />
      <app-ui-stat-card
        label="Cited ({{ citedWindow }}d)"
        [value]="cited()"
        [status]="citedStatus()"
        detail="Lessons the pump actually applied"
      />
    </div>
  `,
  styles: [`
    .ghs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
  `],
})
export class GroomingHealthStrip {
  protected readonly citedWindow = CITED_WINDOW_DAYS;

  private readonly pipelineRes = httpResource<PipelineResponse>(
    () => `${environment.dashboardApiUrl}/api/grooming/pipeline`,
  );
  private readonly lessonsRes = httpResource<Lesson[]>(
    () => `${environment.dashboardApiUrl}/api/grooming/lessons`,
  );
  private readonly uningestedRes = httpResource<Correction[]>(
    () => `${environment.dashboardApiUrl}/api/grooming/corrections/uningested`,
  );

  private readonly counts = computed(() => this.pipelineRes.value()?.counts ?? {});
  private readonly lessons = computed(() => this.lessonsRes.value() ?? []);
  private readonly uningestedCount = computed(() => this.uningestedRes.value()?.length ?? 0);

  private readonly ungroomedCount = computed(() => this.counts()['ungroomed'] ?? 0);
  private readonly totalCount = computed(() =>
    Object.values(this.counts()).reduce((sum, n) => sum + n, 0));
  private readonly activeCount = computed(() => this.lessons().filter(l => l.active).length);
  private readonly citedCount = computed(() => {
    const cutoff = Date.now() - CITED_WINDOW_DAYS * DAY_MS;
    return this.lessons().filter(l => {
      const at = l.last_cited_at ? Date.parse(l.last_cited_at) : NaN;
      return !Number.isNaN(at) && at >= cutoff;
    }).length;
  });

  protected readonly ungroomed = computed(() => fmt(this.pipelineRes, this.ungroomedCount()));
  protected readonly uningested = computed(() => fmt(this.uningestedRes, this.uningestedCount()));
  protected readonly activeLessons = computed(() => fmt(this.lessonsRes, this.activeCount()));
  protected readonly cited = computed(() => fmt(this.lessonsRes, this.citedCount()));

  protected readonly ungroomedDetail = computed(() => {
    const total = this.totalCount();
    if (!total) return null;
    return `${Math.round((this.ungroomedCount() / total) * 100)}% of ${total} items`;
  });

  protected readonly lessonsDetail = computed(() => {
    const all = this.lessons().length;
    return all ? `${all} total, ${all - this.activeCount()} inactive` : null;
  });

  // Thresholds encode "the loop is turning over", not absolute badness: any
  // undistilled correction backlog or any uncited-lesson state means the
  // feedback path has stalled somewhere.
  protected readonly ungroomedStatus = computed(() => {
    const total = this.totalCount();
    if (!total) return 'neutral' as const;
    const share = this.ungroomedCount() / total;
    return share > 0.5 ? 'alert' : share > 0.2 ? 'warn' : 'neutral';
  });
  protected readonly uningestedStatus = computed(() =>
    this.uningestedCount() > 20 ? 'alert' : this.uningestedCount() > 0 ? 'warn' : 'neutral');
  protected readonly activeLessonsStatus = computed(() =>
    this.lessons().length > 0 && this.activeCount() === 0 ? 'alert' : 'neutral');
  protected readonly citedStatus = computed(() =>
    this.activeCount() > 0 && this.citedCount() === 0 ? 'alert' : 'neutral');
}

/** Placeholders while loading / on error, so a failed fetch can't read as 0. */
function fmt(res: { isLoading: () => boolean; error: () => unknown }, n: number): string {
  if (res.isLoading()) return '…';
  if (res.error()) return '—';
  return String(n);
}
