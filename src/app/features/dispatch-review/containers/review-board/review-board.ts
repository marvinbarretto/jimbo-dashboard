import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { ReviewService, type ReviewItem } from '../../data-access/review.service';

@Component({
  selector: 'app-review-board',
  imports: [UiStack, UiPageHeader, UiCard, UiButton, UiBadge, UiEmptyState],
  templateUrl: './review-board.html',
  styleUrl: './review-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page-bleed' },
})
export class ReviewBoard {
  private readonly service = inject(ReviewService);

  readonly items = this.service.items;
  readonly isLoading = this.service.isLoading;

  refresh(): void {
    this.service.load();
  }

  approve(item: ReviewItem): void {
    this.service.approve(item);
  }

  sendBack(item: ReviewItem): void {
    const reason = window.prompt(`Send "${item.title ?? item.seq ?? 'this item'}" back — what needs reworking?`);
    if (reason && reason.trim()) {
      this.service.sendBack(item, reason.trim());
    }
  }
}
