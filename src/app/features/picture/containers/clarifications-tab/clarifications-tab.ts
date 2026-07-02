import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs';
import type { Clarification } from '@domain/clarifications';
import { clarificationId } from '@domain/ids';
import type { FilterGroup } from '@shared/components/kanban-filter-bar/kanban-filter-bar';
import { KanbanFilterBar } from '@shared/components/kanban-filter-bar/kanban-filter-bar';
import { createKanbanFilterState } from '@shared/kanban/filter-state';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { ClarificationsService } from '../../data-access/clarifications.service';
import { ClarificationCard } from '../../components/clarification-card/clarification-card';
import { STATUS, KIND, SOURCE_KIND, statusFilterGroup, kindFilterGroup, sourceKindFilterGroup } from '../../util/clarification-filter-groups';

interface SkipOpts {
  skipStatus?: boolean;
  skipKind?: boolean;
  skipSourceKind?: boolean;
}

@Component({
  selector: 'app-clarifications-tab',
  imports: [KanbanFilterBar, ClarificationCard, UiEmptyState, UiLoadingState],
  templateUrl: './clarifications-tab.html',
  styleUrl: './clarifications-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClarificationsTab {
  private readonly service = inject(ClarificationsService);
  private readonly route = inject(ActivatedRoute);
  private readonly filter = createKanbanFilterState([STATUS, KIND, SOURCE_KIND]);
  private hasScrolledToHighlight = false;

  readonly loading = this.service.loading;
  readonly statusActive = this.filter.active<string>(STATUS);
  readonly kindActive = this.filter.active<string>(KIND);
  readonly sourceKindActive = this.filter.active<string>(SOURCE_KIND);

  // Set from a ?clarification=<id> deep-link (e.g. a Context item's "from a
  // clarification" link). The target is definitionally answered, so it must
  // bypass the default open-only filter below.
  readonly highlightId = signal<string | null>(null);

  readonly filtered = computed(() => this.service.clarifications().filter(c => this.matches(c)));

  readonly filterGroups = computed<FilterGroup[]>(() => [
    statusFilterGroup(this.service.clarifications().filter(c => this.matches(c, { skipStatus: true })), this.statusActive()),
    kindFilterGroup(this.service.clarifications().filter(c => this.matches(c, { skipKind: true })), this.kindActive()),
    sourceKindFilterGroup(this.service.clarifications().filter(c => this.matches(c, { skipSourceKind: true })), this.sourceKindActive()),
  ]);

  constructor() {
    this.service.load();

    this.route.queryParamMap.pipe(take(1)).subscribe(params => {
      const target = params.get('clarification');
      if (target) {
        this.highlightId.set(target);
      } else {
        // Default view is the open queue; clearing/adding chips pulls in
        // history. Skipped when deep-linking to a specific (likely answered)
        // clarification so it isn't filtered out from under the link.
        this.filter.toggle(STATUS, 'open');
      }
    });

    // Scrolls the highlighted card into view once it's actually in the
    // filtered/rendered list — runs once, guarded by hasScrolledToHighlight.
    effect(() => {
      const target = this.highlightId();
      if (!target || this.hasScrolledToHighlight) return;
      if (!this.filtered().some(c => c.id === target)) return;
      this.hasScrolledToHighlight = true;
      queueMicrotask(() => {
        document.getElementById(`clarification-${target}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    });
  }

  onFilterToggle(event: { groupId: string; value: string | number }): void {
    this.filter.toggle(event.groupId, event.value);
  }

  onFilterReset(): void {
    this.filter.reset();
  }

  onDismiss(id: string): void {
    this.service.dismiss(clarificationId(id));
  }

  onAnswered(event: { id: string; text: string }): void {
    this.service.answer(clarificationId(event.id), event.text);
  }

  private matches(c: Clarification, skip: SkipOpts = {}): boolean {
    if (!skip.skipStatus && this.statusActive().size > 0 && !this.statusActive().has(c.status)) return false;
    if (!skip.skipKind && this.kindActive().size > 0 && !this.kindActive().has(c.kind)) return false;
    if (!skip.skipSourceKind && this.sourceKindActive().size > 0 && !this.sourceKindActive().has(c.source_kind)) return false;
    return true;
  }
}
