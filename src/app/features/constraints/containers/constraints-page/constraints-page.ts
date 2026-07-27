import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiToggle } from '@shared/components/ui-toggle/ui-toggle';
import {
  ConstraintsService,
  type ConstraintItem,
  type ConstraintSection,
} from '../../data-access/constraints.service';

@Component({
  selector: 'app-constraints-page',
  imports: [FormsModule, UiEmptyState, UiLoadingState, UiPage, UiSection, UiToggle],
  templateUrl: './constraints-page.html',
  styleUrl: './constraints-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstraintsPage {
  private readonly service = inject(ConstraintsService);

  readonly sections = this.service.sections;
  readonly isLoading = this.service.isLoading;
  readonly error = this.service.error;
  readonly activeCount = this.service.activeCount;
  readonly totalCount = this.service.totalCount;

  /** Draft text per section id — each section has its own add box. */
  readonly drafts = signal<Record<number, string>>({});

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

  /** "3 of 4 on" — the count that matters is what an agent will actually see. */
  sectionMeta(section: ConstraintSection): string {
    const on = section.items.filter(i => i.status === 'active').length;
    return `${on} of ${section.items.length} on`;
  }
}
