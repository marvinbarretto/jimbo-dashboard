// NOTE: The /activity-events endpoint does not yet exist in jimbo-api (Hono + SQLite on VPS).
// This service scaffolds the project-side pattern. Mirrors ActivityEventsService but
// scopes events by project_id rather than vault_item_id.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { ActivityEvent, ProjectActivityEvent } from '../../../domain/activity/activity-event';
import { isProjectEvent } from '../../../domain/activity/activity-event';
import type { ProjectId } from '../../../domain/ids';
import { activityId } from '../../../domain/ids';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '../../../shared/seed-mode';
import { SEED } from '../../../domain/seed';

// Distributive Omit so each event variant loses id/at independently.
type CreatePayload<T> = T extends unknown ? Omit<T, 'id' | 'at'> : never;
type EventPayload = CreatePayload<ProjectActivityEvent>;

@Injectable({ providedIn: 'root' })
export class ProjectActivityEventsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/activity-events`;

  // Keyed by project_id string. Lazy-populated via loadFor().
  private readonly _eventsByProject = signal<Record<string, ProjectActivityEvent[]>>({});

  // Sorted-desc timeline scoped to a single project. Mirrors the vault-side helper.
  eventsFor(projectId: ProjectId) {
    return computed(() => {
      const events = this._eventsByProject()[projectId] ?? [];
      return [...events].sort((a, b) => b.at.localeCompare(a.at));
    });
  }

  loadFor(projectId: ProjectId): void {
    if (isSeedMode()) {
      // Widen from the as-const tuple so the type predicate narrows correctly.
      const all = SEED.activity_events as readonly ActivityEvent[];
      const data: ProjectActivityEvent[] = all.filter(isProjectEvent).filter(e => e.project_id === projectId);
      this._eventsByProject.update(map => ({ ...map, [projectId]: [...data] }));
      return;
    }
    const params = new HttpParams()
      .set('project_id', `eq.${projectId}`)
      .set('order', 'at.desc');
    this.http.get<ProjectActivityEvent[]>(this.url, { params }).subscribe({
      next: data => this._eventsByProject.update(map => ({ ...map, [projectId]: data })),
      error: () => this._eventsByProject.update(map => ({ ...map, [projectId]: [] })),
    });
  }

  // Optimistic insert — emits the event locally and fires POST.
  // Same "leave optimistic on error" rationale as the vault-side service.
  post(event: EventPayload): void {
    const now = new Date().toISOString();
    const tempId = activityId(crypto.randomUUID());
    const optimistic = { ...event, id: tempId, at: now } as ProjectActivityEvent;
    const key = event.project_id;

    this._eventsByProject.update(map => ({
      ...map,
      [key]: [...(map[key] ?? []), optimistic],
    }));

    if (isSeedMode()) return;

    this.http.post<ProjectActivityEvent>(this.url, optimistic).subscribe({
      next: saved => this._eventsByProject.update(map => ({
        ...map,
        [key]: (map[key] ?? []).map(e => e.id === tempId ? saved : e),
      })),
      error: () => {},
    });
  }
}
