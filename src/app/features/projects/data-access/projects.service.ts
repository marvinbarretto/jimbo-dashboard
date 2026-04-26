// Reads projects from the dashboard's new Hono+Drizzle API at /api/projects
// (jimbo_pg-backed). Mutations still hit the legacy PostgREST surface.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { Project, ProjectStatus, CreateProjectPayload, UpdateProjectPayload } from '@domain/projects';
import type { ActorId, ProjectId } from '@domain/ids';
import { actorId, projectId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';
import { ProjectActivityEventsService } from './project-activity-events.service';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);
  private readonly activityService = inject(ProjectActivityEventsService);
  private readonly url = `${environment.apiUrl}/projects`;

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
    this.http.get<{ items: ApiProject[] }>(`${environment.dashboardApiUrl}/api/projects`).subscribe({
      next: ({ items }) => { this._projects.set(items.map(toProject)); this._loading.set(false); },
      error: ()         => this._loading.set(false),
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

    this.http.post<Project[]>(this.url, payload, { headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([created]) => {
          this._projects.update(ps => ps.map(p => p.id === payload.id ? created : p));
          this.activityService.post({
            type: 'project_created',
            project_id: created.id,
            actor_id: this.currentActorId,
          });
        },
        error: () => this._projects.update(ps => ps.filter(p => p.id !== payload.id)),
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

    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.patch<Project[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([updated]) => {
          this._projects.update(ps => ps.map(p => p.id === id ? updated : p));
          this.emitDiffEvents(projectIdTyped, prior, updated);
        },
        error: () => this._projects.update(ps => ps.map(p => p.id === id ? prior : p)),
      });
  }

  remove(id: string): void {
    const prior = this.getById(id);
    this._projects.update(ps => ps.filter(p => p.id !== id));

    if (isSeedMode()) return;

    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.delete(this.url, { params })
      .subscribe({
        error: () => {
          if (prior) this._projects.update(ps => [...ps, prior]);
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
// Production schema is narrower than dashboard's Project — no description,
// no owner_actor_id, no criteria, no repo_url. Synthesize defaults; richer
// fields filled in once production tracks them.

interface ApiProject {
  id: string;
  display_name: string;
  status: string;                 // 'active' | 'paused' | 'archived' (CHECK-bound)
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
    description: null,
    status: narrowStatus(p.status),
    // Default ownership to marvin until production tracks it. Synthesized
    // projects from tag conventions have no owner stored.
    owner_actor_id: actorId('marvin'),
    criteria: null,
    repo_url: null,
    created_at: p.created_at,
  };
}
