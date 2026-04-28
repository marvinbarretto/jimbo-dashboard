// Reads + mutates actors via dashboard-api at /dashboard-api/api/actors
// (jimbo_pg-backed). Migration 0003 added runtime/description/is_active to the
// table; the API now returns them so the synthesis layer that used to infer
// runtime from id is gone.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Actor, ActorKind, ActorRuntime, CreateActorPayload, UpdateActorPayload } from '@domain/actors';
import { actorId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class ActorsService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/actors`;

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
    this.http.get<{ items: ApiActor[] }>(this.url).subscribe({
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
    this.http.post<ApiActor>(this.url, payload)
      .subscribe({
        next: (created) => {
          this._actors.update(as => as.map(a => a.id === payload.id ? toActor(created) : a));
          this.toast.success('Actor created');
        },
        error: () => {
          this._actors.update(as => as.filter(a => a.id !== payload.id));
          this.toast.error('Failed to create actor');
        },
      });
  }

  update(id: string, patch: UpdateActorPayload): void {
    this.http.patch<ApiActor>(`${this.url}/${encodeURIComponent(id)}`, patch)
      .subscribe({
        next: (updated) => this._actors.update(as => as.map(a => a.id === id ? toActor(updated) : a)),
        error: () => this.toast.error('Failed to update actor'),
      });
  }

  remove(id: string): void {
    this.http.delete(`${this.url}/${encodeURIComponent(id)}`)
      .subscribe({
        next: () => this._actors.update(as => as.filter(a => a.id !== id)),
        error: () => this.toast.error('Failed to delete actor'),
      });
  }
}

// ── API response adaptation ────────────────────────────────────────────────
// Schema now includes runtime/description/is_active (migration 0003), so the
// adapter is a thin shape-coercion rather than the old synthesis pass.

interface ApiActor {
  id: string;
  display_name: string;
  kind: string;
  runtime: string | null;
  description: string | null;
  is_active: boolean;
  color_token: string | null;
  created_at: string;
  updated_at: string;
}

function narrowKind(k: string): ActorKind {
  return k === 'human' || k === 'agent' || k === 'system' ? k : 'agent';
}

function narrowRuntime(r: string | null): ActorRuntime {
  if (r === 'ollama' || r === 'anthropic' || r === 'openrouter' || r === 'hermes') return r;
  return null;
}

function toActor(a: ApiActor): Actor {
  return {
    id: actorId(a.id),
    display_name: a.display_name,
    kind: narrowKind(a.kind),
    runtime: narrowRuntime(a.runtime),
    description: a.description,
    is_active: a.is_active,
    created_at: a.created_at,
    updated_at: a.updated_at,
  };
}
