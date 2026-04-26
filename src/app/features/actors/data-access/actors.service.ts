// Reads actors from the dashboard's new Hono+Drizzle API at /api/actors
// (jimbo_pg-backed). Mutations still hit the legacy PostgREST surface.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { Actor, ActorKind, ActorRuntime, CreateActorPayload, UpdateActorPayload } from '@domain/actors';
import { actorId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class ActorsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/actors`;

  private readonly _actors = signal<Actor[]>([]);
  private readonly _loading = signal(true);

  readonly actors = this._actors.asReadonly();
  readonly activeActors = computed(() => this._actors().filter(a => a.is_active));
  readonly isLoading = this._loading.asReadonly();

  constructor() { this.load(); }

  private load(): void {
    if (isSeedMode()) {
      this._actors.set([...SEED.actors]);
      this._loading.set(false);
      return;
    }
    this.http.get<{ items: ApiActor[] }>(`${environment.dashboardApiUrl}/api/actors`).subscribe({
      next: ({ items }) => { this._actors.set(items.map(toActor)); this._loading.set(false); },
      error: ()         => this._loading.set(false),
    });
  }

  getById(id: string): Actor | undefined {
    return this._actors().find(a => a.id === id);
  }

  create(payload: CreateActorPayload): void {
    const now = new Date().toISOString();
    const optimistic: Actor = { ...payload, created_at: now, updated_at: now };
    this._actors.update(as => [...as, optimistic]);
    this.http.post<Actor[]>(this.url, payload, { headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([created]) => this._actors.update(as => as.map(a => a.id === payload.id ? created : a)),
        error: ()          => this._actors.update(as => as.filter(a => a.id !== payload.id)),
      });
  }

  update(id: string, patch: UpdateActorPayload): void {
    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.patch<Actor[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({ next: ([updated]) => this._actors.update(as => as.map(a => a.id === id ? updated : a)) });
  }

  remove(id: string): void {
    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.delete(this.url, { params })
      .subscribe({ next: () => this._actors.update(as => as.filter(a => a.id !== id)) });
  }
}

// ── API response adaptation ────────────────────────────────────────────────
// Production schema is narrower than dashboard's Actor — no runtime/description
// /is_active. Synthesize sensible defaults from kind.

interface ApiActor {
  id: string;
  display_name: string;
  kind: string;
  color_token: string | null;
  created_at: string;
  updated_at: string;
}

function narrowKind(k: string): ActorKind {
  return k === 'human' || k === 'agent' || k === 'system' ? k : 'agent';
}

// Best-effort runtime mapping per known agent. ralph/boris are the production
// executors; richer mapping comes when the production schema acquires the column.
function inferRuntime(id: string, kind: ActorKind): ActorRuntime {
  if (kind === 'human') return null;
  if (id === 'ralph') return 'ollama';
  if (id === 'boris') return 'openrouter';
  return null;
}

function toActor(a: ApiActor): Actor {
  const kind = narrowKind(a.kind);
  return {
    id: actorId(a.id),
    display_name: a.display_name,
    kind,
    runtime: inferRuntime(a.id, kind),
    description: null,
    is_active: true,
    created_at: a.created_at,
    updated_at: a.updated_at,
  };
}
