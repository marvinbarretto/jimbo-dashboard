import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DialogRef } from '@angular/cdk/dialog';
import { Subject, debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

interface SearchResult {
  source: string;
  source_id: string;
  title: string;
  snippet: string;
  score: number;
  updated_at: string | null;
  url: string;
}

interface SearchResponse {
  q: string;
  took_ms: number;
  total: number;
  results: SearchResult[];
}

const SOURCE_LABELS: Record<string, string> = {
  vault_notes: 'Task',
  email:       'Email',
  dispatch:    'Dispatch',
  briefing:    'Briefing',
  grooming:    'Grooming',
  context:     'Context',
  activity:    'Activity',
};

@Component({
  selector: 'app-search-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Global search' },
  template: `
    <div class="search-dialog">
      <div class="search-dialog__input-row">
        <span class="search-dialog__icon" aria-hidden="true">⌕</span>
        <input
          #inputEl
          class="search-dialog__input"
          type="search"
          autocomplete="off"
          placeholder="Search tasks, emails, grooming…"
          [value]="query()"
          (input)="onInput($event)"
          (keydown)="onInputKey($event)"
          aria-label="Search"
        />
        @if (loading()) {
          <span class="search-dialog__spinner" aria-label="Searching…"></span>
        }
      </div>

      @if (results().length > 0) {
        <ul class="search-dialog__results" role="listbox" aria-label="Search results">
          @for (r of results(); track r.source_id; let i = $index) {
            <li
              class="search-dialog__result"
              [class.search-dialog__result--active]="activeIndex() === i"
              role="option"
              [attr.aria-selected]="activeIndex() === i"
              (click)="selectResult(r)"
              (mouseenter)="activeIndex.set(i)">
              <span class="search-dialog__result-source">{{ labelFor(r.source) }}</span>
              <span class="search-dialog__result-title">{{ r.title }}</span>
              @if (r.snippet) {
                <span class="search-dialog__result-snippet" [innerHTML]="r.snippet"></span>
              }
            </li>
          }
        </ul>
      } @else if (query().length >= 2 && !loading()) {
        <p class="search-dialog__empty">No results for <strong>{{ query() }}</strong></p>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: calc(var(--radius) * 1.5);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
      overflow: hidden;
    }

    .search-dialog__input-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--color-border);
    }

    .search-dialog__icon {
      font-size: 1.1rem;
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    .search-dialog__input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font: inherit;
      font-size: 1rem;
      color: var(--color-text);

      &::placeholder { color: var(--color-text-muted); }
      &::-webkit-search-cancel-button { display: none; }
    }

    .search-dialog__spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid var(--color-border);
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .search-dialog__results {
      list-style: none;
      margin: 0;
      padding: 0.375rem 0;
      max-height: 400px;
      overflow-y: auto;
    }

    .search-dialog__result {
      display: grid;
      grid-template-columns: 4.5rem 1fr;
      grid-template-rows: auto auto;
      gap: 0 0.75rem;
      padding: 0.5rem 1rem;
      cursor: pointer;
      border-radius: var(--radius);
      margin: 0 0.375rem;

      &--active {
        background: color-mix(in srgb, var(--color-accent) 10%, transparent);
      }
    }

    .search-dialog__result-source {
      grid-row: 1 / 3;
      align-self: center;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }

    .search-dialog__result-title {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .search-dialog__result-snippet {
      font-size: 0.78rem;
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      ::ng-deep mark {
        background: color-mix(in srgb, var(--color-accent) 25%, transparent);
        color: inherit;
        border-radius: 2px;
      }
    }

    .search-dialog__empty {
      padding: 1.25rem 1rem;
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-text-muted);
      text-align: center;
    }
  `],
})
export class SearchDialog {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly dialogRef = inject(DialogRef);
  private readonly destroy = inject(DestroyRef);
  private readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');

  protected readonly query = signal('');
  protected readonly results = signal<SearchResult[]>([]);
  protected readonly loading = signal(false);
  protected readonly activeIndex = signal(0);

  protected readonly hasResults = computed(() => this.results().length > 0);

  private readonly query$ = new Subject<string>();

  constructor() {
    this.query$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      filter(q => q.length >= 2),
      switchMap(q => {
        this.loading.set(true);
        return this.http.get<SearchResponse>(`${environment.dashboardApiUrl}/api/search`, {
          params: { q, limit: '12' },
        });
      }),
      takeUntilDestroyed(this.destroy),
    ).subscribe({
      next: (res) => {
        this.results.set(res.results);
        this.activeIndex.set(0);
        this.loading.set(false);
      },
      error: () => {
        this.results.set([]);
        this.loading.set(false);
      },
    });
  }

  protected onInput(e: Event): void {
    const q = (e.target as HTMLInputElement).value;
    this.query.set(q);
    if (q.length < 2) {
      this.results.set([]);
      this.loading.set(false);
    } else {
      this.query$.next(q);
    }
  }

  protected onInputKey(e: KeyboardEvent): void {
    const count = this.results().length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.activeIndex.update(i => Math.min(i + 1, count - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.activeIndex.update(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && count > 0) {
      e.preventDefault();
      this.selectResult(this.results()[this.activeIndex()]);
    } else if (e.key === 'Escape') {
      this.dialogRef.close();
    }
  }

  protected selectResult(r: SearchResult): void {
    this.dialogRef.close();
    // Strip the Caddy-served prefix so it navigates within the SPA.
    const appBase = '/app/jimbo/dashboard';
    const path = r.url.startsWith(appBase) ? r.url.slice(appBase.length) || '/' : r.url;
    this.router.navigateByUrl(path);
  }

  protected labelFor(source: string): string {
    return SOURCE_LABELS[source] ?? source;
  }
}
