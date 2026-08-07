import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiFilterPills, type UiFilterPillOption } from '@shared/components/ui-filter-pills/ui-filter-pills';
import { relativeTime } from '@shared/utils/datetime.utils';
import {
  InterrogateModesService,
  type InterrogateMode,
  type ModeDepth,
} from '../../data-access/interrogate-modes.service';

type DepthFilter = 'all' | ModeDepth | 'meta';

const DEPTH_ORDER: Record<ModeDepth, number> = { light: 0, medium: 1, deep: 2 };

/**
 * The 20 interrogation modes, in one place.
 *
 * Sorted unrun-first rather than by score, because the useful question is not
 * "what does the picker want next" but "what have I never tried" — the answer
 * being most of them.
 */
@Component({
  selector: 'app-modes-tab',
  imports: [UiEmptyState, UiLoadingState, UiStatCard, UiFilterPills],
  templateUrl: './modes-tab.html',
  styleUrl: './modes-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModesTab {
  private readonly service = inject(InterrogateModesService);

  readonly loading = this.service.loading;
  readonly error = this.service.error;

  readonly filter = signal<DepthFilter>('all');

  readonly all = computed(() => this.service.modes());

  readonly filterOptions = computed<UiFilterPillOption[]>(() => {
    const modes = this.all();
    const count = (f: DepthFilter) => modes.filter(m => this.matches(m, f)).length;
    return [
      { value: 'all', label: 'All', count: modes.length },
      { value: 'light', label: 'Light', count: count('light') },
      { value: 'medium', label: 'Medium', count: count('medium') },
      { value: 'deep', label: 'Deep', count: count('deep') },
      { value: 'meta', label: 'Meta', count: count('meta') },
    ];
  });

  readonly visible = computed(() => {
    const f = this.filter();
    return this.all()
      .filter(m => this.matches(m, f))
      .sort((a, b) => {
        // Never-run first — that is the gap worth seeing.
        if (!a.last_run_at !== !b.last_run_at) return a.last_run_at ? 1 : -1;
        const d = DEPTH_ORDER[a.depth] - DEPTH_ORDER[b.depth];
        return d !== 0 ? d : a.name.localeCompare(b.name);
      });
  });

  readonly neverRun = computed(() => this.all().filter(m => !m.last_run_at).length);

  readonly goalProducing = computed(() =>
    this.all().filter(m => m.entities.includes('goal')).map(m => m.slug),
  );

  private matches(m: InterrogateMode, f: DepthFilter): boolean {
    if (f === 'all') return true;
    if (f === 'meta') return m.meta;
    return !m.meta && m.depth === f;
  }

  onFilter(value: string): void {
    this.filter.set(value as DepthFilter);
  }

  lastRunLabel(m: InterrogateMode): string {
    return m.last_run_at ? relativeTime(m.last_run_at) : 'never';
  }

  /** The invocation to type. Auto-pick skips meta modes, so those must be forced. */
  command(m: InterrogateMode): string {
    return `/interrogate ${m.slug}`;
  }
}
