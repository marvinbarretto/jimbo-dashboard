import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import type { EndpointConfig } from '../../../api-data/data-pages';
import { JimboDataService, type JsonObject } from '../../../api-data/data-access/jimbo-data.service';

interface SummaryEntry {
  key: string;
  value: string;
}

interface DisplayRow {
  id: string;
  values: Record<string, string>;
  raw: unknown;
}

@Component({
  selector: 'app-mail-dataset-card',
  imports: [JsonPipe, UiButton, UiCard, UiEmptyState, UiLoadingState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-card class="mail-dataset-card" tone="soft">
      <section class="mail-dataset-card__inner">
        <header class="mail-dataset-card__header">
          <div class="mail-dataset-card__copy">
            <h2>{{ endpoint().title }}</h2>
            <p>{{ endpoint().summary }}</p>
            <code>{{ endpoint().path }}</code>
          </div>
          <div class="mail-dataset-card__meta">
            <span class="mail-dataset-card__count">{{ countLabel() }}</span>
            <app-ui-button size="sm" variant="secondary" (pressed)="load()">Reload</app-ui-button>
          </div>
        </header>

        @if (loading()) {
          <app-ui-loading-state label="Loading dataset" message="Fetching latest mail data." />
        } @else if (error(); as e) {
          <app-ui-empty-state title="Request failed" [message]="e" />
        } @else {
          @if (summaryEntries().length > 0) {
            <dl class="mail-dataset-card__summary">
              @for (entry of summaryEntries(); track entry.key) {
                <div>
                  <dt>{{ entry.key }}</dt>
                  <dd>{{ entry.value }}</dd>
                </div>
              }
            </dl>
          }

          @if (rows().length > 0) {
            <div class="mail-dataset-card__table-wrap">
              <table class="mail-dataset-card__table" aria-label="Mail dataset rows">
                <thead>
                  <tr>
                    @for (column of columns(); track column) {
                      <th>{{ column }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of displayedRows(); track row.id) {
                    <tr
                      class="mail-dataset-card__row"
                      [class.mail-dataset-card__row--active]="expandedRowId() === row.id"
                      tabindex="0"
                      role="button"
                      [attr.aria-expanded]="expandedRowId() === row.id"
                      (click)="toggleRow(row.id)"
                      (keydown.enter)="toggleRow(row.id)"
                      (keydown.space)="toggleRow(row.id); $event.preventDefault()">
                      @for (column of columns(); track column) {
                        <td>{{ row.values[column] }}</td>
                      }
                    </tr>
                    @if (expandedRowId() === row.id) {
                      <tr class="mail-dataset-card__expanded-row">
                        <td [attr.colspan]="columns().length">
                          <div class="mail-dataset-card__expanded-content">
                            <dl class="mail-dataset-card__summary">
                              @for (entry of detailEntries(row); track entry.key) {
                                <div>
                                  <dt>{{ entry.key }}</dt>
                                  <dd>{{ entry.value }}</dd>
                                </div>
                              }
                            </dl>
                            <pre>{{ row.raw | json }}</pre>
                          </div>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
            @if (rows().length > rowsLimit()) {
              <p class="mail-dataset-card__state">
                Showing {{ rowsLimit() }} of {{ rows().length }} rows.
              </p>
            }
          } @else if (summaryEntries().length === 0) {
            <app-ui-empty-state
              title="No structured data"
              message="This endpoint returned a payload, but not one that is yet mapped into rows." />
          }

          <details class="mail-dataset-card__raw">
            <summary>Raw JSON</summary>
            <pre>{{ payload() | json }}</pre>
          </details>
        }
      </section>
    </app-ui-card>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }

    .mail-dataset-card__inner {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      padding: 1rem;
      min-width: 0;
    }

    .mail-dataset-card__header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
    }

    .mail-dataset-card__copy {
      min-width: 0;
    }

    .mail-dataset-card__copy h2 {
      margin: 0 0 0.2rem;
      font-size: 1rem;
    }

    .mail-dataset-card__copy p {
      margin: 0 0 0.35rem;
      color: var(--color-text-muted);
      font-size: 0.84rem;
    }

    .mail-dataset-card__copy code {
      color: var(--color-text-muted);
    }

    .mail-dataset-card__meta {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-shrink: 0;
    }

    .mail-dataset-card__count {
      color: var(--color-info);
      font-family: var(--font-mono);
      font-size: 0.75rem;
      white-space: nowrap;
    }

    .mail-dataset-card__summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.5rem;
    }

    .mail-dataset-card__summary div {
      border: 1px solid var(--color-border);
      padding: 0.55rem 0.65rem;
      background: var(--color-bg);
      min-width: 0;
    }

    .mail-dataset-card__summary dt {
      color: var(--color-text-muted);
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .mail-dataset-card__summary dd {
      color: var(--color-text);
      font-family: var(--font-mono);
      font-size: 0.75rem;
      overflow-wrap: anywhere;
    }

    .mail-dataset-card__state {
      color: var(--color-text-muted);
      font-size: 0.82rem;
      margin: 0;
    }

    .mail-dataset-card__table-wrap {
      overflow-x: auto;
      border: 1px solid var(--color-border);
      background: var(--color-surface-soft);
    }

    .mail-dataset-card__table {
      min-width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
    }

    .mail-dataset-card__table th,
    .mail-dataset-card__table td {
      padding: 0.8rem 0.9rem;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
      vertical-align: top;
      overflow-wrap: anywhere;
      max-width: 20rem;
    }

    .mail-dataset-card__table th {
      color: var(--color-text-soft);
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: var(--color-surface-soft);
    }

    .mail-dataset-card__row {
      cursor: pointer;
    }

    .mail-dataset-card__row:hover {
      background: color-mix(in srgb, var(--color-accent) 5%, transparent);
    }

    .mail-dataset-card__row:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: -2px;
    }

    .mail-dataset-card__row--active {
      background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    }

    .mail-dataset-card__expanded-row td {
      background: color-mix(in srgb, var(--color-surface-soft) 92%, var(--color-bg));
    }

    .mail-dataset-card__expanded-content {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .mail-dataset-card__raw summary {
      cursor: pointer;
      color: var(--color-text-muted);
      font-size: 0.75rem;
    }

    .mail-dataset-card__raw pre {
      margin-top: 0.5rem;
      max-height: 420px;
      overflow: auto;
      padding: 0.75rem;
      background: var(--color-bg);
      color: var(--color-text-muted);
      font-size: 0.72rem;
    }

    @media (max-width: 768px) {
      .mail-dataset-card__header {
        flex-direction: column;
      }

      .mail-dataset-card__meta {
        width: 100%;
        justify-content: space-between;
      }
    }
  `],
})
export class MailDatasetCard implements OnInit {
  readonly endpoint = input.required<EndpointConfig>();
  readonly rowsLimit = input(12);

  private readonly data = inject(JimboDataService);

  readonly loading = signal(false);
  readonly payload = signal<unknown>(null);
  readonly error = signal<string | null>(null);
  readonly expandedRowId = signal<string | null>(null);

  readonly rows = computed(() => extractRows(this.payload()));
  readonly columns = computed(() => inferColumns(this.rows()));
  readonly displayedRows = computed(() =>
    toDisplayRows(this.rows(), this.columns()).slice(0, this.rowsLimit()),
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
        this.expandedRowId.set(null);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  toggleRow(id: string): void {
    this.expandedRowId.update(current => current === id ? null : id);
  }

  detailEntries(row: DisplayRow): SummaryEntry[] {
    return Object.entries(row.values).map(([key, value]) => ({ key, value }));
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

function toDisplayRows(rows: unknown[], columns: string[]): DisplayRow[] {
  return rows.map((row, index) => {
    const record: Record<string, string> = {};
    if (!isRecord(row)) {
      record['value'] = formatValue(row);
      return {
        id: `row-${index}`,
        values: record,
        raw: row,
      };
    }
    for (const key of columns) {
      record[key] = formatValue(row[key]);
    }
    return {
      id: inferRowId(row, index),
      values: record,
      raw: row,
    };
  });
}

function inferRowId(row: JsonObject, index: number): string {
  for (const key of ['id', 'message_id', 'thread_id', 'report_id', 'gmail_id']) {
    const value = row[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return `row-${index}`;
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
