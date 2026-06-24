// Reads + mutates projects via dashboard-api at /dashboard-api/api/projects
// (jimbo_pg-backed). Migration 0003 added description / owner_actor_id /
// criteria / repo_url; the API now returns and accepts them, so the synthesis
// pass that defaulted owner_actor_id to 'marvin' has been replaced with a
// passthrough adapter.
//
// color_token: picked from PROJECT_PALETTE on create, stored in DB, returned
// here and injected as CSS vars by ProjectColorsService.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Project, CreateProjectPayload, UpdateProjectPayload } from '@domain/projects';
import { EMPTY_PROJECT_BRIEF } from '@domain/projects';
import { CURRENT_ACTOR_ID } from '@domain/actors';
import { ApiProjectSchema, type ApiProject } from '@domain/projects/project.api-schema';
import { z } from 'zod';
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

  private readonly currentActorId: ActorId = CURRENT_ACTOR_ID;

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
    this.http.get<unknown>(this.url).subscribe({
      next: (raw) => {
        const result = z.array(ApiProjectSchema).safeParse(raw);
        if (!result.success) {
          console.error('[projects] /api/projects response failed schema:', result.error.issues);
          this.toast.error('Failed to load projects — API response did not match expected shape');
          this._loading.set(false);
          return;
        }
        this._projects.set(result.data.map(toProject));
        this._loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load projects — network or server error');
        this._loading.set(false);
      },
    });
  }

  getById(id: string): Project | undefined {
    return this._projects().find(p => p.id === id);
  }

  create(payload: CreateProjectPayload): void {
    const now = new Date().toISOString();
    const color_token = payload.color_token ?? pickProjectColor(
      this._projects().map(p => p.color_token).filter((c): c is string => c !== null)
    );
    const withColor = { ...payload, color_token };
    // Fill brief slots the caller didn't provide so the optimistic row is a
    // complete Project (brief fields are required on the domain type).
    const optimistic: Project = { ...EMPTY_PROJECT_BRIEF, ...withColor, created_at: now, synced_at: null, repos: null };
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

    this.http.post<unknown>(this.url, withColor).subscribe({
      next: (raw) => {
        const result = ApiProjectSchema.safeParse(raw);
        if (!result.success) {
          console.error('[projects] POST response failed schema:', result.error.issues);
          this.toast.error(`Created "${payload.display_name}" but response was malformed — refresh to confirm`);
          return;
        }
        const p = toProject(result.data);
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

    this.http.patch<unknown>(`${this.url}/${encodeURIComponent(id)}`, patch).subscribe({
      next: (raw) => {
        const result = ApiProjectSchema.safeParse(raw);
        if (!result.success) {
          console.error('[projects] PATCH response failed schema:', result.error.issues);
          this.toast.error(`Saved "${prior.display_name}" but response was malformed — refresh to confirm`);
          return;
        }
        const p = toProject(result.data);
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
// Shape comes from ApiProjectSchema (Zod). Status normalisation
// (paused→active) lives in the schema's transform so the parsed value is
// already domain-correct.

// Curated palette — muted, readable on both light and dark surfaces.
// Order is intentional: adjacent entries are visually distinct.
export const PROJECT_PALETTE = [
  '#7a8fc4', // muted blue
  '#c47a8f', // muted magenta
  '#7ac4a4', // muted green
  '#c4a47a', // muted gold
  '#a47ac4', // muted violet
  '#7ac4c4', // muted cyan
  '#c47a7a', // muted red
  '#a4c47a', // muted lime
  '#c4b07a', // muted amber
  '#7a9fc4', // steel blue
] as const;

export function pickProjectColor(usedColors: string[]): string {
  const used = new Set(usedColors);
  return PROJECT_PALETTE.find(c => !used.has(c)) ?? PROJECT_PALETTE[usedColors.length % PROJECT_PALETTE.length];
}

function toProject(p: ApiProject): Project {
  return {
    id: projectId(p.id),
    display_name: p.display_name,
    description: p.description,
    status: p.status,
    kind: p.kind,
    owner_actor_id: p.owner_actor_id ? actorId(p.owner_actor_id) : null,
    criteria: p.criteria,
    repo_url: p.repo_url,
    color_token: p.color_token,
    created_at: p.created_at,
    synced_at: p.synced_at,
    repos: p.repos,
    intent: p.intent,
    personas: p.personas,
    success_criteria: p.success_criteria,
    current_state: p.current_state,
    out_of_scope: p.out_of_scope,
    key_resources: p.key_resources,
    entry_points: p.entry_points,
    deploy_target: p.deploy_target,
    observability: p.observability,
    conventions_url: p.conventions_url,
    footguns: p.footguns,
    autonomy_level: p.autonomy_level,
    current_blocker: p.current_blocker,
    common_tasks: p.common_tasks,
  };
}
