// Project-side activity timeline. No `project_activity` table exists in
// jimbo_pg yet — this service was scaffolded against legacy PostgREST that
// silently returned empty results.
//
// Phase 3 part 3: kept as a typed-stub returning empty until we have a
// reason to model project-level events. Seed mode still works (UI renders
// from local fixtures). When we want this for real, add a
// `project_activity` table + dashboard-api endpoint, mirror the
// vault-side adapter pattern.

import { Injectable, signal, computed, inject } from '@angular/core';
import type { ActivityEvent, ProjectActivityEvent } from '@domain/activity/activity-event';
import { isProjectEvent } from '@domain/activity/activity-event';
import type { ProjectId } from '@domain/ids';
import { activityId } from '@domain/ids';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

type CreatePayload<T> = T extends unknown ? Omit<T, 'id' | 'at'> : never;
type EventPayload = CreatePayload<ProjectActivityEvent>;

@Injectable({ providedIn: 'root' })
export class ProjectActivityEventsService {
  private readonly _eventsByProject = signal<Record<string, ProjectActivityEvent[]>>({});

  eventsFor(projectId: ProjectId) {
    return computed(() => {
      const events = this._eventsByProject()[projectId] ?? [];
      return [...events].sort((a, b) => b.at.localeCompare(a.at));
    });
  }

  loadFor(projectId: ProjectId): void {
    if (isSeedMode()) {
      const all = SEED.activity_events as readonly ActivityEvent[];
      const data: ProjectActivityEvent[] = all.filter(isProjectEvent).filter(e => e.project_id === projectId);
      this._eventsByProject.update(map => ({ ...map, [projectId]: [...data] }));
      return;
    }
    // No backend yet — empty state matches prior production behaviour.
    this._eventsByProject.update(map => ({ ...map, [projectId]: [] }));
  }

  post(event: EventPayload): void {
    const now = new Date().toISOString();
    const tempId = activityId(crypto.randomUUID());
    const optimistic = { ...event, id: tempId, at: now } as ProjectActivityEvent;
    const key = event.project_id;
    // Local-only — won't persist until a project_activity table lands.
    this._eventsByProject.update(map => ({
      ...map,
      [key]: [...(map[key] ?? []), optimistic],
    }));
  }
}
