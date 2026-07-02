import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { ContextFile, ContextSection } from '@domain/interrogate';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiInlineTabs, type UiInlineTabOption } from '@shared/components/ui-inline-tabs/ui-inline-tabs';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiFilterPills, type UiFilterPillOption } from '@shared/components/ui-filter-pills/ui-filter-pills';
import { InterrogateSnapshotService } from '../../data-access/interrogate-snapshot.service';
import { ContextService } from '../../data-access/context.service';
import { ContextItemRow, type ContextItemEdit } from '../../components/context-item-row/context-item-row';
import { ContextItemComposer } from '../../components/context-item-composer/context-item-composer';

function itemCount(file: ContextFile): number {
  return file.sections.reduce((sum, s) => sum + s.items.length, 0);
}

@Component({
  selector: 'app-context-tab',
  imports: [UiEmptyState, UiInlineTabs, UiStatCard, UiFilterPills, ContextItemRow, ContextItemComposer],
  templateUrl: './context-tab.html',
  styleUrl: './context-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextTab {
  private readonly snapshotService = inject(InterrogateSnapshotService);
  private readonly contextService = inject(ContextService);

  private readonly files = computed<ContextFile[]>(() =>
    Object.values(this.snapshotService.context()).sort((a, b) => a.sort_order - b.sort_order),
  );

  private readonly activeSlug = signal<string | null>(null);
  private readonly activeCategory = signal<string | null>(null);

  readonly fileTabs = computed<UiInlineTabOption[]>(() =>
    this.files().map(f => ({ value: f.slug, label: f.display_name, count: itemCount(f) })),
  );

  // Falls back to the first file until a tab's been clicked, and again
  // whenever the previously active slug disappears from a fresh snapshot.
  readonly activeFile = computed<ContextFile | null>(() => {
    const files = this.files();
    if (!files.length) return null;
    return files.find(f => f.slug === this.activeSlug()) ?? files[0];
  });

  readonly sectionsTotal = computed(() => this.activeFile()?.sections.length ?? 0);
  readonly itemsTotal = computed(() => {
    const file = this.activeFile();
    return file ? itemCount(file) : 0;
  });

  // Only meaningful for files that actually use status (Priorities does;
  // Interests/Goals/Glossary don't) — worth surfacing, not worth faking.
  readonly needsAttention = computed(() => {
    const file = this.activeFile();
    if (!file) return 0;
    return file.sections
      .flatMap(s => s.items)
      .filter(i => i.status === 'paused' || i.status === 'deferred').length;
  });

  // Category filter only earns its keep when a file actually spreads items
  // across 2+ categories — most files leave category null throughout.
  readonly categoryOptions = computed<UiFilterPillOption[]>(() => {
    const file = this.activeFile();
    if (!file) return [];
    const counts = new Map<string, number>();
    for (const section of file.sections) {
      for (const item of section.items) {
        if (!item.category) continue;
        counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
      }
    }
    if (counts.size < 2) return [];
    return Array.from(counts.entries()).map(([value, count]) => ({ value, label: value, count }));
  });

  readonly activeCategoryList = computed(() => {
    const category = this.activeCategory();
    return category ? [category] : [];
  });

  readonly visibleSections = computed<ContextSection[]>(() => {
    const file = this.activeFile();
    if (!file) return [];
    const category = this.activeCategory();
    if (!category) return file.sections;
    return file.sections
      .map(section => ({ ...section, items: section.items.filter(i => i.category === category) }))
      .filter(section => section.items.length > 0);
  });

  onFileChange(slug: string): void {
    this.activeSlug.set(slug);
    this.activeCategory.set(null);
  }

  onCategoryToggle(value: string): void {
    this.activeCategory.update(current => current === value ? null : value);
  }

  onEdited(sectionId: number, edit: ContextItemEdit): void {
    this.contextService.updateItem(sectionId, edit.id, { content: edit.content });
  }

  onDeleted(sectionId: number, itemId: number): void {
    this.contextService.deleteItem(sectionId, itemId);
  }

  onAdded(sectionId: number, content: string): void {
    this.contextService.addItem(sectionId, content);
  }
}
