// Reads + mutates actors via dashboard-api at /dashboard-api/api/actors
// (jimbo_pg-backed). Migration 0003 added description/is_active to the table;
// the API returns them, so the old synthesis layer that guessed fields from the
// actor id is gone.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Actor, CreateActorPayload, UpdateActorPayload } from '@domain/actors';
import { ApiActorSchema, ApiActorListSchema, type ApiActor } from '@domain/actors/actor.api-schema';
import { actorId, type ActorId } from '@domain/ids';
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
    this.http.get<unknown>(this.url).subscribe({
      next: (raw) => {
        const result = ApiActorListSchema.safeParse(raw);
        if (!result.success) {
          // Schema mismatch: surface immediately rather than letting bad
          // data flow through and bite us later. The first failure with
          // best-effort path information is enough to start debugging.
          console.error('[actors] /api/actors response failed schema:', result.error.issues);
          this.toast.error('Failed to load actors — API response did not match expected shape');
          this._loading.set(false);
          return;
        }
        this._actors.set(result.data.map(toActor));
        this._loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load actors — network or server error');
        this._loading.set(false);
      },
    });
  }

  // Lookup by branded id. Callers MUST hand in an ActorId — pass
  // `wellKnownActorId('marvin')` for compile-time-known refs, or
  // `actorId(rowFromApi.assigned_to)` for runtime values from the API.
  // Plain strings won't compile, so typos like 'marivn' get caught.
  getById(id: ActorId): Actor | undefined {
    return this._actors().find(a => a.id === id);
  }

  create(payload: CreateActorPayload): void {
    const now = new Date().toISOString();
    const optimistic: Actor = { ...payload, created_at: now, updated_at: now };
    this._actors.update(as => [...as, optimistic]);
    this.http.post<unknown>(this.url, payload)
      .subscribe({
        next: (raw) => {
          const result = ApiActorSchema.safeParse(raw);
          if (!result.success) {
            console.error('[actors] POST response failed schema:', result.error.issues);
            this.toast.error(`Created "${payload.display_name}" but response was malformed — refresh to confirm`);
            return;
          }
          this._actors.update(as => as.map(a => a.id === payload.id ? toActor(result.data) : a));
          this.toast.success(`Actor "${payload.display_name}" created`);
        },
        error: () => {
          this._actors.update(as => as.filter(a => a.id !== payload.id));
          this.toast.error(`Failed to create actor "${payload.display_name}"`);
        },
      });
  }

  update(id: ActorId, patch: UpdateActorPayload): void {
    const prior = this.getById(id);
    this.http.patch<unknown>(`${this.url}/${encodeURIComponent(id)}`, patch)
      .subscribe({
        next: (raw) => {
          const result = ApiActorSchema.safeParse(raw);
          if (!result.success) {
            console.error('[actors] PATCH response failed schema:', result.error.issues);
            this.toast.error(`Updated "${prior?.display_name ?? id}" but response was malformed — refresh to confirm`);
            return;
          }
          this._actors.update(as => as.map(a => a.id === id ? toActor(result.data) : a));
        },
        error: () => this.toast.error(`Failed to update actor "${prior?.display_name ?? id}"`),
      });
  }

  remove(id: ActorId): void {
    const prior = this.getById(id);
    this.http.delete(`${this.url}/${encodeURIComponent(id)}`)
      .subscribe({
        next: () => this._actors.update(as => as.filter(a => a.id !== id)),
        error: () => this.toast.error(`Failed to delete actor "${prior?.display_name ?? id}"`),
      });
  }
}

// ── API response adaptation ────────────────────────────────────────────────
// Shape comes from ApiActorSchema (Zod). The old narrowKind / narrowServes
// helpers were silent coercers — they accepted bad data and
// substituted defaults. The schema now refuses to parse bad enums, so this
// adapter is a thin brand-and-pass.

function toActor(a: ApiActor): Actor {
  return {
    id: actorId(a.id),
    display_name: a.display_name,
    kind: a.kind,
    description: a.description,
    is_active: a.is_active,
    serves: a.serves,
    created_at: a.created_at,
    updated_at: a.updated_at,
  };
}
