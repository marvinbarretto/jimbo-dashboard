import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiProgressMeter } from '@shared/components/ui-progress-meter/ui-progress-meter';
import { ReviewService, type ReviewItem } from '../../data-access/review.service';

@Component({
  selector: 'app-review-board',
  imports: [
    UiStack, UiPageHeader, UiCard, UiButton, UiBadge, UiEmptyState, UiProse,
    UiStatCard, UiProgressMeter,
  ],
  templateUrl: './review-board.html',
  styleUrl: './review-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page-bleed' },
})
export class ReviewBoard {
  private readonly service = inject(ReviewService);

  readonly items = this.service.items;
  readonly isLoading = this.service.isLoading;

  /**
   * The commission lane's brake, made visible.
   *
   * Unreviewed items occupy slots against the concurrency cap, so this queue
   * paces execution. Null when the gauge could not be read — the template shows
   * nothing rather than zeros, because an unmeasured queue must not read as an
   * idle one.
   */
  readonly pressure = this.service.pressure;

  /** Warn as the lane fills; alert once nothing new can start. */
  readonly capacityStatus = computed<'neutral' | 'warn' | 'alert'>(() => {
    const p = this.pressure();
    if (!p) return 'neutral';
    if (p.blocked) return 'alert';
    return p.slotsFree <= 2 ? 'warn' : 'neutral';
  });

  /** "1 slot free", not "1 slots free". */
  readonly slotsDetail = computed(() => {
    const p = this.pressure();
    if (!p) return null;
    if (p.blocked) return 'nothing new can start';
    return p.slotsFree === 1 ? '1 slot free' : `${p.slotsFree} slots free`;
  });

  readonly waitStatus = computed<'neutral' | 'warn' | 'alert'>(() => {
    const days = this.pressure()?.oldestWaitDays ?? null;
    if (days === null) return 'neutral';
    if (days >= 30) return 'alert';
    return days >= 7 ? 'warn' : 'neutral';
  });

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
