import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { createColumnHelper, type ColumnDef } from '@tanstack/angular-table';
import { UiDataTable } from '@shared/components/ui-data-table/ui-data-table';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import type { EndpointConfig } from '../../data-pages';
import { JimboDataService, type JsonObject } from '../../data-access/jimbo-data.service';

interface SummaryEntry {
  key: string;
  value: string;
}

@Component({
  selector: 'app-endpoint-panel',
  imports: [JsonPipe, UiDataTable, UiEmptyState, UiLoadingState],
  templateUrl: './endpoint-panel.html',
  styleUrl: './endpoint-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EndpointPanel implements OnInit {
  readonly endpoint = input.required<EndpointConfig>();
  readonly compact = input<boolean>(false);

  private readonly data = inject(JimboDataService);
  private readonly columnHelper = createColumnHelper<Record<string, string>>();

  readonly loading = signal(false);
  readonly payload = signal<unknown>(null);
  readonly error = signal<string | null>(null);

  readonly rows = computed(() => extractRows(this.payload()));
  readonly columns = computed(() => inferColumns(this.rows()));
  readonly displayedRows = computed(() => {
    const limit = this.compact() ? 8 : 25;
    return toDisplayRows(this.rows(), this.columns()).slice(0, limit);
  });
  readonly tableColumns = computed<ColumnDef<Record<string, string>, any>[]>(() =>
    this.columns().map(key =>
      this.columnHelper.accessor(key, {
        id: key,
        header: key,
      }),
    ),
  );
  readonly summaryEntries = computed(() => extractSummary(this.payload()));
  readonly countLabel = computed(() => countLabel(this.payload(), this.rows()));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const endpoint = this.endpoint();
    this.loading.set(true);
    this.error.set(null);

    this.data.get(endpoint.path, endpoint.params).subscribe({
      next: payload => {
        this.payload.set(payload);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

}

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  const preferred = [
    'items', 'messages', 'events', 'tasks', 'lists', 'calendars', 'snapshots',
    'runs', 'jobs', 'records', 'files', 'values', 'interests', 'sessions',
    'proposals', 'candidates',
  ];
  for (const key of preferred) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function inferColumns(rows: unknown[]): string[] {
  const first = rows.find(isRecord);
  if (!first) return ['value'];

  const keys = Object.keys(first);
  const scalar = keys.filter(key => isScalar(first[key]));
  const complex = keys.filter(key => !isScalar(first[key]));
  return [...scalar, ...complex].slice(0, 8);
}

function toDisplayRows(rows: unknown[], columns: string[]): Array<Record<string, string>> {
  return rows.map(row => {
    const record: Record<string, string> = {};
    if (!isRecord(row)) {
      record['value'] = formatValue(row);
      return record;
    }
    for (const key of columns) {
      record[key] = formatValue(row[key]);
    }
    return record;
  });
}

function extractSummary(payload: unknown): SummaryEntry[] {
  if (!isRecord(payload) || Array.isArray(payload)) return [];
  return Object.entries(payload)
    .filter(([, value]) => isScalar(value))
    .slice(0, 8)
    .map(([key, value]) => ({ key, value: formatValue(value) }));
}

function countLabel(payload: unknown, rows: unknown[]): string {
  if (rows.length > 0) return `${rows.length} row${rows.length === 1 ? '' : 's'}`;
  if (isRecord(payload)) {
    for (const key of ['count', 'total', 'days']) {
      const value = payload[key];
      if (typeof value === 'number' || typeof value === 'string') return `${value}`;
    }
  }
  return payload === null ? 'not loaded' : 'object';
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isScalar(value: unknown): boolean {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value.length > 140 ? `${value.slice(0, 137)}...` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    const json = JSON.stringify(value);
    return json.length > 140 ? `${json.slice(0, 137)}...` : json;
  } catch {
    return '[unrenderable]';
  }
}

function errorMessage(err: unknown): string {
  if (isRecord(err)) {
    const message = err['message'];
    if (typeof message === 'string') return message;
  }
  return 'Request failed';
}
