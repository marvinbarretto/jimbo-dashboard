import { ChangeDetectionStrategy, Component, TemplateRef, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type CellContext, createColumnHelper, type ColumnDef } from '@tanstack/angular-table';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiDataTable } from '@shared/components/ui-data-table/ui-data-table';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { ModelsService } from '../../data-access/models.service';
import { modelProvider, modelLocalName, type Model, type ModelStatus } from '@domain/models';

// OpenRouter prices are USD-per-token strings; the table displays $/MTok.
function priceToMTok(s: string | undefined): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Number((n * 1_000_000).toFixed(2)) : null;
}

@Component({
  selector: 'app-models-list',
  imports: [
    RouterLink,
    UiBadge,
    UiDataTable,
    UiEmptyState,
    UiLoadingState,
    UiPageHeader,
    UiStack,
  ],
  templateUrl: './models-list.html',
  styleUrl: './models-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelsList {
  private readonly service = inject(ModelsService);
  private readonly columnHelper = createColumnHelper<Model>();

  readonly models = this.service.models;
  readonly isLoading = this.service.isLoading;
  readonly error = this.service.error;
  private readonly providerCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Model, string | null> }>>('providerCell');
  private readonly nameCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Model, string> }>>('nameCell');
  private readonly statusCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Model, ModelStatus> }>>('statusCell');

  readonly columns: ColumnDef<Model, any>[] = [
    this.columnHelper.accessor(row => this.provider(row.id), {
      id: 'provider',
      header: 'Provider',
      cell: () => this.providerCell(),
      sortingFn: 'alphanumeric',
    }),
    this.columnHelper.accessor(row => this.localName(row.id), {
      id: 'name',
      header: 'Name',
      cell: () => this.nameCell(),
      sortingFn: 'alphanumeric',
    }),
    this.columnHelper.accessor(row => row.metadata.status, {
      id: 'status',
      header: 'Status',
      cell: () => this.statusCell(),
      sortingFn: 'alphanumeric',
    }),
    this.columnHelper.accessor(row => row.metadata.context_length ?? null, {
      id: 'context',
      header: 'Context',
    }),
    this.columnHelper.accessor(row => priceToMTok(row.metadata.pricing?.prompt), {
      id: 'prompt_price',
      header: 'Prompt $/MTok',
    }),
    this.columnHelper.accessor(row => priceToMTok(row.metadata.pricing?.completion), {
      id: 'completion_price',
      header: 'Completion $/MTok',
    }),
  ];

  readonly modelRowClass = (model: Model): string =>
    model.metadata.status === 'deprecated' ? 'deprecated' : '';

  provider = modelProvider;
  localName = modelLocalName;

  modelLink(id: string): string[] {
    return id.split('/');
  }

  statusTone(status: ModelStatus): 'neutral' | 'success' | 'danger' {
    if (status === 'preferred') return 'success';
    if (status === 'deprecated') return 'danger';
    return 'neutral';
  }
}
