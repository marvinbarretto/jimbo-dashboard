import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import type { EndpointConfig } from '../../data-pages';
import { JimboDataService, type JsonObject } from '../../data-access/jimbo-data.service';

interface SummaryEntry {
  key: string;
  value: string;
}

@Component({
  selector: 'app-endpoint-panel',
  imports: [JsonPipe],
  templateUrl: './endpoint-panel.html',
  styleUrl: './endpoint-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EndpointPanel implements OnInit {
  readonly endpoint = input.required<EndpointConfig>();
  readonly compact = input<boolean>(false);

  private readonly data = inject(JimboDataService);

  readonly loading = signal(false);
  readonly payload = signal<unknown>(null);
  readonly error = signal<string | null>(null);

  readonly rows = computed(() => extractRows(this.payload()));
  readonly columns = computed(() => inferColumns(this.rows()));
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

  cell(row: unknown, key: string): string {
    if (!isRecord(row)) return formatValue(row);
    return formatValue(row[key]);
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
