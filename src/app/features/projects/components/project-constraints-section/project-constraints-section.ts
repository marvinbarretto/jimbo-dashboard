import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiToggle } from '@shared/components/ui-toggle/ui-toggle';
import {
  ConstraintsService,
  type ConstraintItem,
  type ConstraintSection,
} from '../../../constraints/data-access/constraints.service';

// Project-scoped embed of the constraints feature — same rules-agents-apply
// model as the standalone /constraints page, but fetched filtered to one
// project (see ConstraintsService.load). Own ConstraintsService instance via
// `providers` so this never shares state with the global page's.
@Component({
  selector: 'app-project-constraints-section',
  imports: [FormsModule, UiEmptyState, UiLoadingState, UiSection, UiToggle],
  templateUrl: './project-constraints-section.html',
  styleUrl: './project-constraints-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConstraintsService],
})
export class ProjectConstraintsSection {
  private readonly service = inject(ConstraintsService);

  readonly projectId = input.required<string>();

  readonly sections = this.service.sections;
  readonly isLoading = this.service.isLoading;
  readonly error = this.service.error;
  readonly activeCount = this.service.activeCount;
  readonly totalCount = this.service.totalCount;

  /** Draft text per section id — each section has its own add box. */
  readonly drafts = signal<Record<number, string>>({});

  constructor() {
    // ProjectLanding reuses its component instance across a route id change
    // (signal-driven, no destroy/recreate) — reload whenever the project changes.
    effect(() => this.service.load(this.projectId()));
  }

  isOn(item: ConstraintItem): boolean {
    return item.status === 'active';
  }

  toggle(item: ConstraintItem, on: boolean): void {
    this.service.setStatus(item, on ? 'active' : 'paused');
  }

  remove(item: ConstraintItem): void {
    this.service.remove(item);
  }

  draftFor(sectionId: number): string {
    return this.drafts()[sectionId] ?? '';
  }

  setDraft(sectionId: number, value: string): void {
    this.drafts.update(d => ({ ...d, [sectionId]: value }));
  }

  submit(section: ConstraintSection): void {
    const text = this.draftFor(section.id).trim();
    if (!text) return;
    this.service.add(section.id, text);
    this.setDraft(section.id, '');
  }
}
