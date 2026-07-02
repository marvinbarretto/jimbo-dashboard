import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ContextItem, ContextItemCategory, ContextItemStatus, ContextSectionFormat } from '@domain/interrogate';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiInlineEdit } from '@shared/components/ui-inline-edit/ui-inline-edit';
import { relativeTime } from '@shared/utils/datetime.utils';

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const CATEGORY_TONE: Record<ContextItemCategory, BadgeTone> = {
  project: 'accent',
  'life-area': 'info',
  habit: 'success',
  'one-off': 'neutral',
};

const STATUS_TONE: Record<ContextItemStatus, BadgeTone> = {
  active: 'success',
  paused: 'warning',
  deferred: 'neutral',
  completed: 'neutral',
  archived: 'neutral',
};

export interface ContextItemEdit {
  id: number;
  content: string;
}

@Component({
  selector: 'app-context-item-row',
  imports: [UiBadge, UiInlineEdit, RouterLink],
  templateUrl: './context-item-row.html',
  styleUrl: './context-item-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextItemRow {
  readonly item = input.required<ContextItem>();
  readonly format = input<ContextSectionFormat>('list');

  readonly edited = output<ContextItemEdit>();
  readonly deleted = output<number>();

  readonly categoryTone = computed<BadgeTone>(() => {
    const category = this.item().category;
    return category ? CATEGORY_TONE[category] : 'neutral';
  });

  readonly statusTone = computed<BadgeTone>(() => {
    const status = this.item().status;
    return status ? STATUS_TONE[status] : 'neutral';
  });

  // Anchors a relative timeframe word ("tonight", "this week") to an actual
  // date — without it there's no way to tell what "tonight" meant once the
  // page is revisited days later.
  readonly capturedLabel = computed(() => `captured ${relativeTime(this.item().updated_at)}`);
  readonly expiresLabel = computed(() => {
    const expiresAt = this.item().expires_at;
    return expiresAt ? `expires ${relativeTime(expiresAt)}` : null;
  });

  onSaved(content: string): void {
    const trimmed = content.trim();
    if (!trimmed) return;
    this.edited.emit({ id: this.item().id, content: trimmed });
  }

  onDelete(): void {
    this.deleted.emit(this.item().id);
  }
}
