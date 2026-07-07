// Reads module documentation from jimbo-api: GET /api/modules (index with
// computed staleness) and GET /api/modules/:module (adds the markdown body).
// Staleness is computed server-side from git — this service just carries it.

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { ModuleDoc, ModuleDocListResponse, ModuleDocSummary } from './module-doc';

@Injectable({ providedIn: 'root' })
export class ModuleDocsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.dashboardApiUrl}/api/modules`;

  private readonly _modules = signal<ModuleDocSummary[]>([]);
  private readonly _head = signal<string | null>(null);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);

  readonly modules = this._modules.asReadonly();
  /** Short HEAD commit of the checkout jimbo-api is serving docs from. */
  readonly head = this._head.asReadonly();
  readonly isLoading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  constructor() { this.load(); }

  private load(): void {
    this.http.get<ModuleDocListResponse>(this.url).subscribe({
      next: res => {
        this._modules.set(res.items);
        this._head.set(res.head);
        this._loading.set(false);
      },
      error: err => {
        this._error.set(err?.message ?? 'failed to load module docs');
        this._loading.set(false);
      },
    });
  }

  reload(): void {
    this._loading.set(true);
    this._error.set(null);
    this.load();
  }

  // Detail is fetched per-navigation rather than cached: the body is the one
  // field the index omits, and staleness should be as live as possible.
  getDoc(module: string): Observable<ModuleDoc> {
    return this.http.get<ModuleDoc>(`${this.url}/${module}`);
  }
}
