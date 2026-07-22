import { ChangeDetectionStrategy, Component, TemplateRef, computed, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type CellContext, createColumnHelper, type ColumnDef } from '@tanstack/angular-table';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiDataTable } from '@shared/components/ui-data-table/ui-data-table';
import { formatDatetime } from '@shared/utils/datetime.utils';
import { BriefingsService } from '../../data-access/briefings.service';
import { BriefingRating } from '../../components/briefing-rating/briefing-rating';
import type { BriefingAnalysis, BriefingRating as Rating } from '../../data-access/briefing.types';

@Component({
  selector: 'app-briefings-page',
  imports: [RouterLink, UiPageHeader, UiLoadingState, UiEmptyState, UiDataTable, BriefingRating],
  templateUrl: './briefings-page.html',
  styleUrl: './briefings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BriefingsPage {
  private readonly service = inject(BriefingsService);
  private readonly columnHelper = createColumnHelper<BriefingAnalysis>();

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

  private readonly ratingCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<BriefingAnalysis, Rating | null> }>>('ratingCell');
  private readonly linkCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<BriefingAnalysis, number> }>>('linkCell');

  protected readonly columns: ColumnDef<BriefingAnalysis, any>[] = [
    this.columnHelper.accessor(row => row.generated_at, {
      id: 'when',
      header: 'When',
      cell: ctx => this.when(ctx.getValue()),
      sortingFn: 'alphanumeric',
    }),
    this.columnHelper.accessor(row => this.modelShort(row.model), {
      id: 'model',
      header: 'Model',
      sortingFn: 'alphanumeric',
    }),
    this.columnHelper.accessor(row => row.rating, {
      id: 'rating',
      header: 'Your rating',
      cell: () => this.ratingCell(),
    }),
    this.columnHelper.accessor(row => row.id, {
      id: 'link',
      header: '',
      cell: () => this.linkCell(),
      enableSorting: false,
    }),
  ];

  protected isSaving(id: number): boolean {
    return this.service.isSaving(id);
  }

  protected modelShort(model: string): string {
    return model.split('/').at(-1) ?? model;
  }

  protected when(generatedAt: string): string {
    return formatDatetime(generatedAt);
  }

  protected reload(): void {
    void this.service.load();
  }

  protected onRate(b: BriefingAnalysis, ev: { rating: Rating; note: string | null }): void {
    void this.service.rate(b.id, ev.rating, ev.note);
  }
}
