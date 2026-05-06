// Reads + mutates projects via dashboard-api at /dashboard-api/api/projects
// (jimbo_pg-backed). Migration 0003 added description / owner_actor_id /
// criteria / repo_url; the API now returns and accepts them, so the synthesis
// pass that defaulted owner_actor_id to 'marvin' has been replaced with a
// passthrough adapter.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Project, ProjectStatus, CreateProjectPayload, UpdateProjectPayload } from '@domain/projects';
import type { ActorId, ProjectId } from '@domain/ids';
import { actorId, projectId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';
import { ProjectActivityEventsService } from './project-activity-events.service';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);
  private readonly activityService = inject(ProjectActivityEventsService);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/projects`;

  private readonly _projects = signal<Project[]>([]);
  private readonly _loading = signal(true);

  readonly projects = this._projects.asReadonly();
  readonly activeProjects = computed(() => this._projects().filter(p => p.status === 'active'));
  readonly isLoading = this._loading.asReadonly();

  // Hardcoded operator; real session context is a later pass.
  private readonly currentActorId: ActorId = actorId('marvin');

  constructor() { this.load(); }

  private load(): void {
    if (isSeedMode()) {
      this._projects.set([...SEED.projects]);
      this._loading.set(false);
      return;
    }
    // GET /api/projects returns a raw Project[] (per the OpenAPI schema —
    // type: array, not the {items} envelope used by some other endpoints).
    // Don't destructure; it leaves items=undefined and the page renders empty.
    this.http.get<ApiProject[]>(this.url).subscribe({
      next: (items) => { this._projects.set(items.map(toProject)); this._loading.set(false); },
      error: ()     => this._loading.set(false),
    });
  }

  getById(id: string): Project | undefined {
    return this._projects().find(p => p.id === id);
  }

  create(payload: CreateProjectPayload): void {
    const now = new Date().toISOString();
    const optimistic: Project = { ...payload, created_at: now };
    this._projects.update(ps => [...ps, optimistic]);

    if (isSeedMode()) {
      // No server confirm — emit event against the (final) id immediately.
      this.activityService.post({
        type: 'project_created',
        project_id: payload.id,
        actor_id: this.currentActorId,
      });
      return;
    }

    this.http.post<ApiProject>(this.url, payload).subscribe({
      next: (created) => {
        const p = toProject(created);
        this._projects.update(ps => ps.map(x => x.id === payload.id ? p : x));
        this.activityService.post({
          type: 'project_created',
          project_id: p.id,
          actor_id: this.currentActorId,
        });
        this.toast.success(`Project "${payload.display_name}" created`);
      },
      error: () => {
        this._projects.update(ps => ps.filter(p => p.id !== payload.id));
        this.toast.error(`Failed to create project "${payload.display_name}"`);
      },
    });
  }

  // Generic patch. Diffs against prior to emit semantic activity events for each
  // field change. Every mutation produces an event (P6) — never silent field writes.
  update(id: string, patch: UpdateProjectPayload): void {
    const prior = this.getById(id);
    if (!prior) return;
    const projectIdTyped = prior.id;
    const optimistic = { ...prior, ...patch };
    this._projects.update(ps => ps.map(p => p.id === id ? optimistic : p));

    if (isSeedMode()) {
      this.emitDiffEvents(projectIdTyped, prior, optimistic);
      return;
    }

    this.http.patch<ApiProject>(`${this.url}/${encodeURIComponent(id)}`, patch).subscribe({
      next: (updated) => {
        const p = toProject(updated);
        this._projects.update(ps => ps.map(x => x.id === id ? p : x));
        this.emitDiffEvents(projectIdTyped, prior, p);
        this.toast.success(`Project "${prior.display_name}" saved`);
      },
      error: () => {
        this._projects.update(ps => ps.map(p => p.id === id ? prior : p));
        this.toast.error(`Update failed — "${prior.display_name}" reverted`);
      },
    });
  }

  remove(id: string): void {
    const prior = this.getById(id);
    this._projects.update(ps => ps.filter(p => p.id !== id));

    if (isSeedMode()) return;

    this.http.delete(`${this.url}/${encodeURIComponent(id)}`).subscribe({
      next: () => this.toast.success(`Project "${prior?.display_name}" deleted`),
      error: () => {
        if (prior) this._projects.update(ps => [...ps, prior]);
        this.toast.error(`Delete failed — "${prior?.display_name}" restored`);
      },
    });
  }

  // Compares the prior project row to the post-update row and posts one event per
  // changed field. Order is fixed (criteria, owner, archive) so the activity log
  // reads predictably when multiple fields change in one save.
  private emitDiffEvents(projectIdTyped: ProjectId, prior: Project, next: Project): void {
    if (prior.criteria !== next.criteria) {
      this.activityService.post({
        type: 'project_criteria_changed',
        project_id: projectIdTyped,
        actor_id: this.currentActorId,
        from: prior.criteria,
        to: next.criteria,
      });
    }
    if (prior.owner_actor_id !== next.owner_actor_id) {
      this.activityService.post({
        type: 'project_owner_changed',
        project_id: projectIdTyped,
        actor_id: this.currentActorId,
        from_actor_id: prior.owner_actor_id,
        to_actor_id: next.owner_actor_id,
        reason: null,
      });
    }
    if (prior.status !== next.status) {
      if (next.status === 'archived') {
        this.activityService.post({
          type: 'project_archived',
          project_id: projectIdTyped,
          actor_id: this.currentActorId,
          note: null,
        });
      } else {
        this.activityService.post({
          type: 'project_unarchived',
          project_id: projectIdTyped,
          actor_id: this.currentActorId,
          note: null,
        });
      }
    }
  }
}

// ── API response adaptation ────────────────────────────────────────────────
// Schema now includes description / owner_actor_id / criteria / repo_url
// (migration 0003), so this is a passthrough rather than the synthesis pass
// it used to be. owner_actor_id is intentionally nullable in the migration
// (some pre-cutover ETL rows have no owner); falls back to 'marvin' as a
// display default when the column is null.

interface ApiProject {
  id: string;
  display_name: string;
  description: string | null;
  status: string;                 // 'active' | 'paused' | 'archived' (CHECK-bound)
  kind: string;                   // 'major' | 'minor'
  owner_actor_id: string | null;
  criteria: string | null;
  repo_url: string | null;
  color_token: string | null;
  created_at: string;
  updated_at: string;
}

function narrowStatus(s: string): ProjectStatus {
  // Dashboard collapses 'paused' into 'active' — see project.ts comment.
  return s === 'archived' ? 'archived' : 'active';
}

function toProject(p: ApiProject): Project {
  return {
    id: projectId(p.id),
    display_name: p.display_name,
    description: p.description,
    status: narrowStatus(p.status),
    kind: p.kind === 'minor' ? 'minor' : 'major',
    owner_actor_id: actorId(p.owner_actor_id ?? 'marvin'),
    criteria: p.criteria,
    repo_url: p.repo_url,
    created_at: p.created_at,
  };
}
