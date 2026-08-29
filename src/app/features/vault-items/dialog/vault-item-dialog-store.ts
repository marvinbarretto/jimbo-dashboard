import {
  DestroyRef,
  Injectable,
  Signal,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { VaultItemsService } from '../data-access/vault-items.service';
import { VaultItemCommands } from '../commands/vault-item-commands';
import { ActivityEventsService } from '../data-access/activity-events.service';
import { VaultItemProjectsService } from '../data-access/vault-item-projects.service';
import { VaultItemDependenciesService } from '../data-access/vault-item-dependencies.service';
import { ActorsService } from '../../actors/data-access/actors.service';
import { ProjectsService } from '../../projects/data-access/projects.service';
import { ThreadService } from '../../thread/data-access/thread.service';
import { ThreadCommands } from '../../thread/commands/thread-commands';
import { ToastService } from '@shared/components/toast/toast.service';
import { computeReadiness, effectivePriority as computeEffectivePriority } from '@domain/vault/readiness';
import { lifecycleState } from '@domain/vault/vault-item';
import { computeNextAction } from '@domain/vault/next-action';
import { actorId, projectId, vaultItemId, threadMessageId } from '@domain/ids';
import { formatDatetime } from '@shared/utils/datetime.utils';
import {
  tagTrigger,
  projectActorTrigger,
  vaultItemTrigger,
} from '@shared/mentions';
import type { ActorId, ProjectId, VaultItemId } from '@domain/ids';
import type { Actor } from '@domain/actors';
import { CURRENT_ACTOR_ID } from '@domain/actors';
import type { Project } from '@domain/projects';
import type { VaultItem, AcceptanceCriterion, Priority } from '@domain/vault/vault-item';
import type { CreateThreadMessagePayload } from '@domain/thread';
import {
  type DialogMode,
  type DraftPayload,
  emptyDraft,
  isDraft,
  isDraftDirty,
  isItem,
  stageFor,
} from './vault-item-dialog-mode';
import type { RejectSubmission } from '../components/vault-item-detail-body/reject-form/reject-form';
import { VaultTypesService } from '../data-access/vault-types.service';

/**
 * Component-scoped state owner for the unified vault-item dialog (and the
 * /vault-items/<seq> page route, which uses the same body component).
 *
 * Owns:
 * - The lifecycle Mode (Draft vs Item, with stage)
 * - Draft scratch state (payload, submitting, error, saved flag)
 * - Per-item derived signals (item, projects, blockers, messages, events,
 *   readiness, parent/children, summaries, available actors, etc.)
 * - Section-collapse state and the fresh-stage initial-collapse effect
 * - Operation methods that delegate to the per-domain root services
 *   (VaultItemsService, VaultItemProjectsService, etc.)
 *
 * Does NOT own:
 * - Routing (swapDetailSeq, closeDetail) — kept in the host component which
 *   knows whether it's running in 'page' or 'modal' surface
 * - Layout / DOM event plumbing — that's the body component's job
 *
 * Provider: register at the dialog shell (VaultItemDetailDialog) and the
 * page route container (VaultItemDetail) so each focused-item context gets
 * its own store instance. The body component injects the same instance via
 * Angular's hierarchical DI.
 */
@Injectable()
export class VaultItemDialogStore {
  private readonly http = inject(HttpClient);
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly vaultTypes = inject(VaultTypesService);
  private readonly commands = inject(VaultItemCommands);
  private readonly activityService = inject(ActivityEventsService);
  private readonly projectsJunction = inject(VaultItemProjectsService);
  private readonly depsService = inject(VaultItemDependenciesService);
  private readonly actorsService = inject(ActorsService);
  private readonly projectsService = inject(ProjectsService);
  private readonly threadService = inject(ThreadService);

  // Post count this store has already reacted to — see the refresh effect in
  // the constructor. The store is component-scoped (one per open dialog), so
  // this never has to be keyed by item.
  private _handledPostCount = 0;
  private readonly threadCommands = inject(ThreadCommands);
  private readonly toast = inject(ToastService);

  private readonly currentActor: ActorId = CURRENT_ACTOR_ID;

  // ── Mode ──────────────────────────────────────────────────────────────────

  private readonly _mode = signal<DialogMode>({ kind: 'draft', payload: emptyDraft });
  readonly mode = this._mode.asReadonly();

  readonly isDraftMode = computed(() => isDraft(this._mode()));

  /** Raw seq when in Item mode; null while in Draft. */
  readonly seq = computed(() => {
    const m = this._mode();
    return isItem(m) ? m.seq : null;
  });

  /** Set/replace the mode. Called once on init by the host, and on Draft → Item morph. */
  setMode(next: DialogMode): void {
    this._mode.set(next);
  }

  // ── Item-resolved signals ─────────────────────────────────────────────────

  readonly item = computed(() => {
    const s = this.seq();
    return s == null ? undefined : this.vaultItemsService.getBySeq(s);
  });

  readonly owner = computed<Actor | undefined>(() => {
    const i = this.item();
    if (!i?.assigned_to) return undefined;
    return this.actorsService.getById(i.assigned_to);
  });

  /**
   * The item's story is over — it was delivered and disposed of, or archived.
   *
   * The detail panel had no notion of this, so a task that had been dispatched,
   * delivered, reviewed and filed still offered tickable acceptance criteria
   * and a green "Ready to dispatch". Both invite an action on work that is
   * finished, and the tickboxes in particular imply the criteria are still
   * waiting on someone — when what actually satisfies them is a delivery
   * nobody can tick into existence.
   */
  readonly isSettled = computed(() => {
    const i = this.item();
    return i ? lifecycleState(i) !== 'active' : false;
  });

  /** Which terminal state, so the panel can name it rather than just hide. */
  readonly settledAs = computed(() => {
    const i = this.item();
    return i ? lifecycleState(i) : 'active';
  });

  readonly isGitHubItem = computed(() => this.item()?.source?.kind === 'github');
  readonly isManual = computed(() => this.item()?.source?.kind === 'manual');

  readonly junctionProjects = computed(() => {
    const i = this.item();
    if (!i) return [];
    return this.projectsJunction.projectsFor(i.id)();
  });

  readonly projects = computed(() =>
    this.junctionProjects()
      .map(j => this.projectsService.getById(j.project_id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
  );

  readonly openBlockers = computed(() => {
    const i = this.item();
    if (!i) return [];
    return this.depsService.blockersFor(i.id)();
  });

  readonly messages = computed(() => {
    const i = this.item();
    if (!i) return [];
    return this.threadService.messagesFor(i.id)();
  });

  readonly events = computed(() => {
    const i = this.item();
    if (!i) return [];
    return this.activityService.eventsFor(i.id)();
  });

  readonly openQuestions = computed(() => {
    const i = this.item();
    if (!i) return [];
    return this.threadService.openQuestionsFor(i.id)();
  });

  /** Thread messages waiting on the viewer, whatever kind they were filed as.
   *  Attention signal only — readiness still gates on typed `question`s. */
  readonly pendingReplies = computed(() => {
    const i = this.item();
    if (!i) return [];
    return this.threadService.pendingRepliesFor(i.id, this.currentActor)();
  });

  readonly readiness = computed(() => {
    const i = this.item();
    if (!i) return undefined;
    const ownerIsHuman = this.owner()?.kind === 'human';
    return computeReadiness(i, this.messages(), this.openBlockers(), ownerIsHuman);
  });

  /** Grooming-override control is only offered while the item is genuinely
   *  ungroomed (nothing to override once the real gate passes) and owned by
   *  a human — an agent can't make the "good enough for me" call. */
  readonly nextAction = computed(() => {
    const i = this.item();
    const r = this.readiness();
    if (!i || !r) return undefined;
    // Epics are containers, not dispatchable work — they carry no readiness
    // pipeline (no AC, no grooming, no priority gate), so suppress the
    // "Waiting on …" banner that those task-only checks would produce.
    // Same reasoning extends to non-task types: a note/bookmark never enters
    // the grooming→dispatch pipeline, so "Waiting on intake review" is noise.
    if (i.is_epic || !this.vaultTypes.isActionable(i.type)) return undefined;
    return computeNextAction(i, r);
  });

  readonly lastActivityAt = computed(() => {
    const evts = this.events();
    if (!evts.length) return undefined;
    return evts[0].at;
  });

  readonly effectivePriority = computed(() => {
    const i = this.item();
    return i ? computeEffectivePriority(i) : null;
  });

  readonly priorityDiverges = computed(() => {
    const i = this.item();
    if (!i || i.manual_priority == null || i.ai_priority == null) return false;
    return i.manual_priority !== i.ai_priority;
  });

  readonly parentItem = computed(() => {
    const i = this.item();
    if (!i?.parent_id) return undefined;
    return this.vaultItemsService.getById(i.parent_id);
  });

  readonly parentRef = computed<{ seq: number; title: string } | null>(() => {
    const p = this.parentItem();
    return p ? { seq: p.seq, title: p.title } : null;
  });

  readonly children = computed(() => {
    const i = this.item();
    if (!i) return [];
    return this.vaultItemsService.items()
      .filter(c => c.parent_id === i.id)
      .sort((a, b) => a.seq - b.seq);
  });

  readonly activeActors = this.actorsService.activeActors;
  readonly activeProjects = this.projectsService.activeProjects;

  /** All epics available to link as a parent — excludes the current item itself. */
  readonly availableEpics = computed(() => {
    const i = this.item();
    return this.vaultItemsService.items()
      .filter(v => v.is_epic && v.id !== i?.id)
      .sort((a, b) => a.seq - b.seq);
  });

  readonly actorMap = computed<Record<ActorId, Actor>>(() => {
    const map = {} as Record<ActorId, Actor>;
    for (const a of this.actorsService.actors()) map[a.id] = a;
    return map;
  });

  readonly availableActors = computed(() =>
    this.activeActors()
      .filter(a => a.kind === 'human' || a.kind === 'agent')
      .map(a => ({ id: a.id, label: a.display_name, kind: a.kind as 'human' | 'agent' }))
  );

  readonly canReject = computed(() => {
    const i = this.item();
    if (!i) return false;
    return i.grooming_status !== 'ungroomed' && i.grooming_status !== 'needs_rework';
  });

  // Demoting means "this isn't work after all" — offered for anything
  // currently workable, not just the literal 'task' type.
  readonly canDemote = computed(() => this.vaultTypes.isActionable(this.item()?.type));


  // ── UI state ──────────────────────────────────────────────────────────────

  readonly showRejectForm = signal(false);
  readonly rationaleExpanded = signal(false);
  readonly addBlockerSeqInput = signal('');

  /** Body starts expanded; activity + thread start collapsed. The fresh-stage
   *  effect refines this to all-collapsed for items with zero thread+activity. */
  readonly sectionBody = signal(true);
  readonly sectionActivity = signal(false);
  readonly sectionThread = signal(false);

  toggleSection(s: 'body' | 'activity' | 'thread'): void {
    if (s === 'body')     this.sectionBody.update(v => !v);
    if (s === 'activity') this.sectionActivity.update(v => !v);
    if (s === 'thread')   this.sectionThread.update(v => !v);
  }

  toggleRationale(): void { this.rationaleExpanded.update(v => !v); }
  openReject(): void  { this.showRejectForm.set(true); }
  closeReject(): void { this.showRejectForm.set(false); }

  readonly showResolveForm = signal(false);
  openResolve(): void  { this.showResolveForm.set(true); this.showRejectForm.set(false); }
  closeResolve(): void { this.showResolveForm.set(false); }

  // ── Draft state ───────────────────────────────────────────────────────────

  private readonly _draftPayload = signal<DraftPayload>(emptyDraft);
  readonly draftPayload = this._draftPayload.asReadonly();

  private readonly _draftSubmitting = signal(false);
  readonly draftSubmitting = this._draftSubmitting.asReadonly();

  private readonly _draftError = signal<string | null>(null);
  readonly draftError = this._draftError.asReadonly();

  /** True after a successful Draft → Item morph. Suppresses the dirty-discard
   *  toast on the destroy hook (the user saved, didn't abandon). */
  private readonly _draftSaved = signal(false);
  readonly draftSaved = this._draftSaved.asReadonly();

  /** Only blocks during in-flight submission. Title-required is surfaced as
   *  an inline error on submit attempt — see `docs/conventions.md` §UX
   *  ("errors over disabled states"). */
  readonly canSubmitDraft = computed(() => !this._draftSubmitting());

  /** Triggers wired into the Draft body textarea (#tag, @actor/project, ~related). */
  readonly draftTriggers = [
    tagTrigger(signal<readonly string[]>([]), (t) => this.addDraftTag(t)),
    projectActorTrigger(
      this.projectsService.activeProjects,
      this.actorsService.activeActors,
      (p) => this.addDraftProject(p),
      (a) => this._draftPayload.update(d => ({ ...d, assignee: a })),
    ),
    vaultItemTrigger(this.http, (it) => this.addDraftRelated(it)),
  ];

  // One-shot destination seed — set once by the dialog host when opening with
  // { kind: 'draft', destination: 'manual' }. Drives grooming_status on submit.
  private readonly _draftDestination = signal<'manual' | null>(null);
  readonly draftDestination = this._draftDestination.asReadonly();

  setDraftDestination(d: 'manual'): void { this._draftDestination.set(d); }

  setDraftTitle(t: string): void {
    this._draftPayload.update(d => ({ ...d, title: t }));
    this._draftError.set(null);
  }

  setDraftBody(b: string): void {
    this._draftPayload.update(d => ({ ...d, body: b }));
  }

  setDraftEpic(v: boolean): void {
    this._draftPayload.update(d => ({ ...d, is_epic: v }));
  }

  setDraftGithubUrl(url: string): void {
    this._draftPayload.update(d => ({ ...d, github_url: url.trim() || null }));
  }

  addDraftTag(tag: string): void {
    this._draftPayload.update(d => ({ ...d, tags: [...d.tags, tag] }));
  }

  removeDraftTag(idx: number): void {
    this._draftPayload.update(d => ({ ...d, tags: d.tags.filter((_, i) => i !== idx) }));
  }

  addDraftProject(p: Project): void {
    this._draftPayload.update(d => ({ ...d, projects: [...d.projects, p] }));
  }

  addDraftProjectById(id: string): void {
    const project = this.projectsService.getById(id);
    if (!project) return;
    const already = this._draftPayload().projects.some(p => p.id === project.id);
    if (!already) this.addDraftProject(project);
  }

  removeDraftProject(idx: number): void {
    this._draftPayload.update(d => ({
      ...d,
      projects: d.projects.filter((_, i) => i !== idx),
      // Clearing the last project also clears the epic flag — you can't have
      // an epic without a project.
      is_epic: d.projects.length === 1 ? false : d.is_epic,
    }));
  }

  removeDraftProjectById(id: string): void {
    const idx = this._draftPayload().projects.findIndex(p => p.id === id);
    if (idx >= 0) this.removeDraftProject(idx);
  }

  removeDraftAssignee(): void {
    this._draftPayload.update(d => ({ ...d, assignee: null }));
  }

  addDraftRelated(item: { id: string; title: string; seq?: number | null }): void {
    this._draftPayload.update(d => ({
      ...d,
      related: [...d.related, { id: vaultItemId(item.id), title: item.title, seq: item.seq ?? null }],
    }));
  }

  removeDraftRelated(idx: number): void {
    this._draftPayload.update(d => ({ ...d, related: d.related.filter((_, i) => i !== idx) }));
  }

  /**
   * Save the draft. On success, flips mode to Item and returns an Observable
   * that emits the new mode (so the host can re-emit as a component output).
   */
  submitDraft(): Observable<DialogMode> {
    if (this._draftSubmitting()) return new Observable<DialogMode>();
    if (this._draftPayload().title.trim().length === 0) {
      this._draftError.set('Title is required');
      return new Observable<DialogMode>();
    }
    const payload = this._draftPayload();
    const destination = this._draftDestination() ?? undefined;
    this._draftSubmitting.set(true);
    this._draftError.set(null);

    return this.vaultItemsService.createWithRelations(payload, { destination }).pipe(
      tap({
        next: (created) => {
          this._draftSubmitting.set(false);
          this._draftSaved.set(true);
          const next: DialogMode = { kind: 'item', seq: created.seq, stage: 'fresh' };
          this._mode.set(next);
        },
        error: (err) => {
          this._draftSubmitting.set(false);
          this._draftError.set(err?.error?.error?.message ?? err?.message ?? 'Save failed');
        },
      }),
      map((created): DialogMode => ({ kind: 'item', seq: created.seq, stage: 'fresh' })),
    );
  }

  // ── Item operations ───────────────────────────────────────────────────────
  // Each method guards on item presence (no-op if not loaded yet) and delegates
  // to the relevant root service. Mirrors the bulk of the old body component's
  // method surface.

  updateTitle(next: string): void {
    const i = this.item(); if (!i) return;
    this.vaultItemsService.update(i.id, { title: next });
  }

  updateBody(next: string): void {
    const i = this.item(); if (!i) return;
    this.vaultItemsService.update(i.id, { body: next });
  }

  updateManualPriority(p: Priority | null): void {
    const i = this.item(); if (!i) return;
    this.vaultItemsService.update(i.id, { manual_priority: p });
  }


  /** Effort in 25-minute pomodoro blocks. null clears the estimate — the
   *  planner falls back to 1 block rather than treating null as zero effort. */
  updateEstimatedBlocks(next: number | null): void {
    const i = this.item(); if (!i) return;
    this.vaultItemsService.update(i.id, { estimated_blocks: next });
  }

  updateTags(next: readonly string[]): void {
    const i = this.item(); if (!i) return;
    this.vaultItemsService.update(i.id, { tags: [...next] });
  }

  /** API serializer drops `done` (newline-joined text only); local optimistic
   *  state shows the change but it doesn't survive reload. */
  updateCriteria(next: readonly AcceptanceCriterion[]): void {
    const i = this.item(); if (!i) return;
    this.vaultItemsService.update(i.id, { acceptance_criteria: [...next] });
  }

  /** null clears the parent. number is a seq the operator typed in; resolved
   *  to a vault-item id with a toast for unknown/self-reference cases. */
  updateParent(next: number | null): void {
    const i = this.item(); if (!i) return;
    if (next === null) {
      if (i.parent_id === null) return;
      this.vaultItemsService.update(i.id, { parent_id: null });
      return;
    }
    if (next === i.seq) {
      this.toast.error("Can't make an item its own parent");
      return;
    }
    const target = this.vaultItemsService.getBySeq(next);
    if (!target) {
      this.toast.error(`No item found with seq #${next}`);
      return;
    }
    if (target.id === i.parent_id) return;
    this.vaultItemsService.update(i.id, { parent_id: target.id });
  }

  /** Flip type from 'task' → 'note' and clear pipeline status so the item
   *  falls off the grooming board. Keeps all project/epic associations intact. */
  demoteToNote(): void {
    const i = this.item(); if (!i) return;
    this.vaultItemsService.update(i.id, { type: 'note', grooming_status: 'ungroomed' });
    this.toast.success('Saved as note');
  }

  archive(): void {
    const i = this.item(); if (!i) return;
    this.commands.archive(i.id);
  }

  /**
   * Close an item with a note explaining why it's fine now.
   *
   * The message goes to two places on purpose. The thread gets it so the
   * closing note reads in sequence with whatever conversation led here; the
   * archive activity event gets it so the reason survives even if the thread
   * is collapsed or the item is later reopened. A bare archive leaves the next
   * reader asking "was this done, or abandoned?" — which is the whole point of
   * the message.
   */
  resolveWithMessage(message: string): void {
    const i = this.item(); if (!i) return;
    const text = message.trim();
    if (!text) return;
    this.threadCommands.post({
      id: threadMessageId(`${Date.now()}-${Math.random().toString(36).slice(2)}`),
      vault_item_id: i.id,
      author_actor_id: this.currentActor,
      kind: 'comment',
      body: text,
      in_reply_to: null,
      answered_by: null,
    });
    // No unconditional success toast. archive() is a no-op when the item is not
    // in the store, and vaultItems.archive() toasts "Archived #seq" itself on a
    // confirmed response — so announcing success here as well could only ever
    // report *intent*, and did: on 2026-08-22 a resolve posted its thread
    // message, silently archived nothing, and still said "Resolved and
    // archived". The item then kept holding a notification slot for hours.
    this.commands.archive(i.id, text);
  }

  // ── Handing back after a reply ────────────────────────────────────────────
  //
  // Replying does NOT reassign on its own — you often add a note to your own
  // item and would not expect it to leave your board. But when someone else's
  // message is sitting on you (pendingAsk), answering it is exactly the moment
  // ownership should go back, so the default is on and visible rather than
  // silent. Untick and the reply is just a reply.
  readonly handBackOnReply = signal(true);
  toggleHandBack(): void { this.handBackOnReply.update(v => !v); }

  /** The actor whose unanswered message is currently sitting on the viewer. */
  readonly pendingAskAuthor = computed<ActorId | null>(() => {
    if (this.openQuestions().length > 0) return null;
    const pending = this.pendingReplies();
    const last = pending.length ? pending[pending.length - 1] : null;
    if (!last || last.author_actor_id === this.currentActor) return null;
    return last.author_actor_id;
  });

  remove(): void {
    const i = this.item(); if (!i) return;
    this.vaultItemsService.remove(i.id);
  }

  setStatus(next: 'active' | 'done'): void {
    const i = this.item(); if (!i) return;
    const isCurrentlyDone = i.completed_at !== null;
    const wantDone = next === 'done';
    if (isCurrentlyDone === wantDone) return;
    if (wantDone) {
      this.commands.complete(i.id);
    } else {
      // Un-completing — no command yet (no readiness/composition concern);
      // service is the right level for now. Add `commands.uncomplete` when
      // un-mark grows audit-trail or compensating actions.
      this.vaultItemsService.setCompleted(i.id, false, null);
    }
  }

  reassign(toActorIdStr: string): void {
    const i = this.item(); if (!i) return;
    this.vaultItemsService.reassign(i.id, actorId(toActorIdStr), null);
  }

  setEpic(next: boolean): void {
    const i = this.item(); if (!i) return;
    this.vaultItemsService.setEpic(i.id, next);
  }

  removeProject(pid: string): void {
    const i = this.item(); if (!i) return;
    this.projectsJunction.remove(i.id, pid as ProjectId);
  }

  addProject(pidStr: string): void {
    const i = this.item();
    if (!i || !pidStr) return;
    const already = this.junctionProjects().some(j => j.project_id === pidStr);
    if (already) return;
    this.projectsJunction.add(i.id, projectId(pidStr));
  }

  removeBlocker(blockerIdStr: string): void {
    const i = this.item(); if (!i) return;
    this.depsService.remove(vaultItemId(blockerIdStr), i.id);
  }

  /** Resolves the seq input to an item, then adds the dependency. Returns
   *  true on success so the host can clear its input. */
  addBlockerBySeq(): boolean {
    const i = this.item(); if (!i) return false;
    const seqRaw = this.addBlockerSeqInput().trim();
    const seq = Number(seqRaw);
    if (!seqRaw || isNaN(seq)) return false;
    const err = this.depsService.addBySeq(seq, i.id);
    if (err) { this.toast.error(err); return false; }
    this.addBlockerSeqInput.set('');
    return true;
  }

  postThreadReply(payload: CreateThreadMessagePayload): void {
    // Read the ask BEFORE posting — once this reply lands it becomes the newest
    // message, so pendingAskAuthor would resolve to null and the hand-back
    // would never fire.
    const handBackTo = this.pendingAskAuthor();
    this.threadCommands.post(payload);

    const i = this.item();
    if (!i || !handBackTo || !this.handBackOnReply()) return;
    // Only hand back what is currently ours; reassigning someone else's item
    // because we commented on it would be a surprise.
    if (i.assigned_to !== this.currentActor) return;
    if (payload.author_actor_id !== this.currentActor) return;

    this.vaultItemsService.reassign(i.id, handBackTo, 'answered in thread');
    this.toast.success(`Replied — handed back to ${this.actorDisplay(handBackTo)}`);
  }

  /** Returns true if the reject submission was applied. Host decides whether
   *  to also close the dialog (modal surface) or stay (page surface). */
  submitReject(submission: RejectSubmission): boolean {
    const i = this.item(); if (!i) return false;
    try {
      this.vaultItemsService.rejectItem(i.id, submission.reason, submission.newOwnerId);
      this.closeReject();
      return true;
    } catch (err: unknown) {
      // Service throws synchronously on validation failure — UI already guards,
      // so this should never fire. Log for visibility if it does.
      console.error('rejectItem failed', err);
      return false;
    }
  }

  // ── Helpers (used in templates) ───────────────────────────────────────────

  actorDisplay(actorIdStr: string): string {
    const a = this.actorsService.getById(actorIdStr as ActorId);
    return a ? `@${a.id}` : `@${actorIdStr}`;
  }

  actorKind(actorIdStr: string): 'human' | 'agent' | 'system' {
    const a = this.actorsService.getById(actorIdStr as ActorId);
    const kind = a?.kind;
    if (kind === 'human' || kind === 'agent' || kind === 'system') return kind;
    return 'system';
  }

  /** Bound arrow function so templates can pass it as an input without
   *  re-creating it on every render. */
  readonly actorLabelFn = (id: string) => this.actorDisplay(id);
  readonly actorKindFn  = (id: string) => this.actorKind(id);

  // ── Effects ───────────────────────────────────────────────────────────────

  /** Tracks which item id we've already applied initial-collapse logic for. */
  private readonly collapsedFor = signal<string | null>(null);

  constructor() {
    // Seed/reseed Draft state when mode flips to Draft. Avoids stale typing
    // surviving a Draft → Item → Draft round-trip on the same store instance.
    effect(() => {
      const m = this._mode();
      if (isDraft(m)) {
        this._draftPayload.set(m.payload);
        this._draftError.set(null);
      }
    });

    // Item mode side-effects — load thread/activity/junctions for the resolved
    // item. No-op for Draft mode (item() is undefined).
    effect(() => {
      const i = this.item();
      if (!i) return;
      this.activityService.loadFor(i.id);
      this.projectsJunction.loadFor(i.id);
      this.depsService.loadFor(i.id);
      this.threadService.loadFor(i.id);
    });

    // Posting to the thread has server-side consequences the client can't
    // predict: the API writes a note_activity row for every message, and an
    // answer that clears the last open question hands the item back to whoever
    // asked. Neither shows up in `_items` or the activity cache on its own, so
    // the Activity panel and the header ("assigned @…", "last activity …")
    // would sit frozen until a reload. Re-pull both when a post lands.
    //
    // `_handledPostCount` is load-bearing, not bookkeeping: `refreshOne` swaps
    // a new object into `_items`, which changes `item()`, which re-runs this
    // effect. Without the guard that's an infinite refresh loop. Acting only
    // on a genuine increase makes the re-entry a no-op.
    effect(() => {
      const i = this.item();
      if (!i) return;
      const posted = this.threadService.postedCount(i.id);
      if (posted === this._handledPostCount) return;
      this._handledPostCount = posted;
      if (posted === 0) return;
      this.activityService.loadFor(i.id);
      this.vaultItemsService.refreshOne(i.id);
    });

    // Fresh-stage collapse — when an Item resolves with zero thread + activity,
    // default-collapse Body/Activity/Thread on first render. Only fires once
    // per item, so manual re-expansion isn't stomped by later count refreshes.
    effect(() => {
      const i = this.item();
      if (!i) return;
      if (this.collapsedFor() === i.id) return;
      const stage = stageFor(this.messages().length, this.events().length);
      if (stage === 'fresh') {
        this.sectionBody.set(false);
        this.sectionActivity.set(false);
        this.sectionThread.set(false);
      }
      this.collapsedFor.set(i.id);
    });

    // Esc / backdrop / X close while in dirty Draft mode → toast a warning so
    // the user knows their typing was discarded. Empty draft closes silently;
    // saved draft (already morphed to Item) closes silently.
    inject(DestroyRef).onDestroy(() => {
      const m = this._mode();
      if (!isDraft(m)) return;
      if (this._draftSaved()) return;
      if (!isDraftDirty(this._draftPayload())) return;
      this.toast.info('Draft discarded');
    });
  }
}
