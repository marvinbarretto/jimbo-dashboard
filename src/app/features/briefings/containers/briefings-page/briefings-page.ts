import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { formatDatetime } from '@shared/utils/datetime.utils';
import { BriefingsService } from '../../data-access/briefings.service';
import { BriefingRating } from '../../components/briefing-rating/briefing-rating';
import type { BriefingAnalysis, BriefingRating as Rating } from '../../data-access/briefing.types';

@Component({
  selector: 'app-briefings-page',
  imports: [RouterLink, UiPageHeader, UiLoadingState, UiEmptyState, BriefingRating],
  templateUrl: './briefings-page.html',
  styleUrl: './briefings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BriefingsPage {
  private readonly service = inject(BriefingsService);

  constructor() {
    // The archive page owns the full-list fetch (the service no longer loads
    // eagerly — see BriefingsService).
    void this.service.load();
  }

  protected readonly briefings = this.service.briefings;
  protected readonly loading = this.service.loading;
  protected readonly error = this.service.error;
  protected readonly quality = this.service.quality;

  protected readonly headerHint = computed(() => {
    const total = this.briefings().length;
    const q = this.quality();
    const base = `${total} briefing${total === 1 ? '' : 's'}`;
    if (q.rated === 0) return `${base} · none rated yet`;
    return `${base} · ${q.rated} rated · ${q.goodOrBetterPct}% Good or better`;
  });

  protected isSaving(id: number): boolean {
    return this.service.isSaving(id);
  }

  protected sessionLabel(session: string): string {
    if (session === 'morning') return 'AM';
    if (session === 'afternoon') return 'PM';
    return session;
  }

  protected modelShort(model: string): string {
    return model.split('/').at(-1) ?? model;
  }

  protected when(b: BriefingAnalysis): string {
    return formatDatetime(b.generated_at);
  }

  protected reload(): void {
    void this.service.load();
  }

  protected onRate(b: BriefingAnalysis, ev: { rating: Rating; note: string | null }): void {
    void this.service.rate(b.id, ev.rating, ev.note);
  }
}
