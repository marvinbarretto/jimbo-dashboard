import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { swapDetailSeq, closeDetail } from '@shared/kanban/detail-modal';
import { VaultItemsService } from '../../data-access/vault-items.service';
import { ActivityEventsService } from '../../data-access/activity-events.service';
import { RejectFormComponent, type RejectSubmission, type RejectActorOption } from './reject-form/reject-form';
import { VaultItemProjectsService } from '../../data-access/vault-item-projects.service';
import { VaultItemDependenciesService } from '../../data-access/vault-item-dependencies.service';
import { ActorsService } from '../../../actors/data-access/actors.service';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import { ThreadService } from '../../../thread/data-access/thread.service';
import { ThreadView } from '../../../thread/components/thread-view/thread-view';
import { computeReadiness, effectivePriority } from '@domain/vault/readiness';
import { actorId, projectId, vaultItemId } from '@domain/ids';
import { lifecycleState, isArchived } from '@domain/vault/vault-item';
import type { AcceptanceCriterion } from '@domain/vault/vault-item';
import { ActivityLogComponent } from './activity-log/activity-log';
import { formatDatetime } from '@shared/utils/datetime.utils';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { ToastService } from '@shared/components/toast/toast.service';
import type { ProjectId, ActorId } from '@domain/ids';
import type { Actor } from '@domain/actors';
import { VaultItemActionBar } from './vault-item-action-bar/vault-item-action-bar';
import { VaultItemDeliveryBlock } from './vault-item-delivery-block/vault-item-delivery-block';
import { VaultItemIdentityHeader } from './vault-item-identity-header/vault-item-identity-header';
import { VaultItemIntakeBlock } from './vault-item-intake-block/vault-item-intake-block';
import { VaultItemLinksBlock } from './vault-item-links-block/vault-item-links-block';
import { VaultItemMetaLine } from './vault-item-meta-line/vault-item-meta-line';
import { VaultItemOverviewCards } from './vault-item-overview-cards/vault-item-overview-cards';
import { VaultItemQuestions } from './vault-item-questions/vault-item-questions';
import { VaultItemStatusChips } from './vault-item-status-chips/vault-item-status-chips';

@Component({
  selector: 'app-vault-item-detail-body',
  imports: [
    RouterLink,
    ThreadView,
    RejectFormComponent,
    ActivityLogComponent,
    UiSection,
    VaultItemActionBar,
    VaultItemDeliveryBlock,
    VaultItemIdentityHeader,
    VaultItemIntakeBlock,
    VaultItemLinksBlock,
    VaultItemMetaLine,
    VaultItemOverviewCards,
    VaultItemQuestions,
    VaultItemStatusChips,
  ],
  templateUrl: './vault-item-detail-body.html',
  styleUrl: './vault-item-detail-body.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultItemDetailBody {
  readonly seq = input.required<number>();
  // 'page' shows the in-bar × back-to-vault link; 'modal' hides it because the
  // dialog shell provides its own close affordance.
  readonly mode = input<'page' | 'modal'>('page');

  private readonly router = inject(Router);
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly activityService = inject(ActivityEventsService);
  private readonly vaultItemProjectsService = inject(VaultItemProjectsService);
  private readonly vaultItemDepsService = inject(VaultItemDependenciesService);
  private readonly actorsService = inject(ActorsService);
  private readonly toast = inject(ToastService);
  private readonly projectsService = inject(ProjectsService);
  private readonly threadService = inject(ThreadService);

  readonly item = computed(() => this.vaultItemsService.getBySeq(this.seq()));

  constructor() {
    effect(() => {
      const i = this.item();
      if (!i) return;
      this.activityService.loadFor(i.id);
      this.vaultItemProjectsService.loadFor(i.id);
      this.vaultItemDepsService.loadFor(i.id);
      this.threadService.loadFor(i.id);
    });
  }

  readonly owner = computed<Actor | undefined>(() => {
    const i = this.item();
    if (!i?.assigned_to) return undefined;
    return this.actorsService.getById(i.assigned_to);
  });

  readonly isGitHubItem = computed(() => this.item()?.source?.kind === 'github');

  // Manual-source items are operator-tracked; their body is a working scratchpad
  // the operator should be able to edit. Ingested items keep audit immutability.
  readonly isManual = computed(() => this.item()?.source?.kind === 'manual');

  onTitleChange(next: string): void {
    const i = this.item();
    if (!i) return;
    this.vaultItemsService.update(i.id, { title: next });
  }

  onBodyChange(next: string): void {
    const i = this.item();
    if (!i) return;
    this.vaultItemsService.update(i.id, { body: next });
  }

  onTagsChange(next: readonly string[]): void {
    const i = this.item();
    if (!i) return;
    this.vaultItemsService.update(i.id, { tags: [...next] });
  }

  // Caveat: API serializer drops `done` (newline-joined text only); local
  // optimistic state shows the change but it doesn't survive reload.
  onCriteriaChange(next: readonly AcceptanceCriterion[]): void {
    const i = this.item();
    if (!i) return;
    this.vaultItemsService.update(i.id, { acceptance_criteria: [...next] });
  }

  // null clears the parent. number is a seq the operator typed in; we resolve
  // to a vault-item id, toast on bad input (unknown seq, self-reference) and
  // persist via update().
  onParentChange(next: number | null): void {
    const i = this.item();
    if (!i) return;
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

  readonly junctionProjects = computed(() => {
    const i = this.item();
    if (!i) return [];
    return this.vaultItemProjectsService.projectsFor(i.id)();
  });

  readonly projects = computed(() =>
    this.junctionProjects()
      .map(j => this.projectsService.getById(j.project_id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
  );

  readonly openBlockers = computed(() => {
    const i = this.item();
    if (!i) return [];
    return this.vaultItemDepsService.blockersFor(i.id)();
  });

  readonly messages = computed(() => {
    const i = this.item();
    if (!i) return [];
    return this.threadService.messagesFor(i.id)();
  });

  readonly readiness = computed(() => {
    const i = this.item();
    if (!i) return undefined;
    return computeReadiness(i, this.messages(), this.openBlockers());
  });

  readonly events = computed(() => {
    const i = this.item();
    if (!i) return [];
    return this.activityService.eventsFor(i.id)();
  });

  readonly lastActivityAt = computed(() => {
    const evts = this.events();
    if (!evts.length) return undefined;
    return evts[0].at;
  });

  readonly sourceSummary = computed(() => {
    const source = this.item()?.source;
    if (!source) return { label: 'Origin', value: 'Unknown', detail: 'No source metadata recorded.' };

    if (source.kind === 'agent') {
      return {
        label: 'Origin',
        value: `Agent · ${source.ref}`,
        detail: 'Likely created or expanded by an agent workflow.',
      };
    }

    if (source.kind === 'manual') {
      return {
        label: 'Origin',
        value: `Manual · ${source.ref}`,
        detail: 'Operator-created intake.',
      };
    }

    return {
      label: 'Origin',
      value: `${source.kind} · ${source.ref}`,
      detail: source.url ?? 'Imported from an external source.',
    };
  });

  readonly hierarchySummary = computed(() => {
    const item = this.item();
    const parent = this.parentItem();
    const childCount = this.children().length;

    if (parent) {
      return {
        label: 'Hierarchy',
        value: `Sub-item of #${parent.seq}`,
        detail: parent.title,
      };
    }

    if (childCount > 0) {
      return {
        label: 'Hierarchy',
        value: `Epic root · ${childCount} child${childCount === 1 ? '' : 'ren'}`,
        detail: 'This item owns sub-items.',
      };
    }

    return {
      label: 'Hierarchy',
      value: 'Standalone',
      detail: item?.parent_id ? item.parent_id : 'Not linked into an epic.',
    };
  });

  readonly timelineSummary = computed(() => {
    const item = this.item();
    if (!item) return { label: 'Timeline', value: 'Unknown', detail: '' };

    const created = `Added ${formatDatetime(item.created_at)}`;
    const latest = item.latest_activity_at
      ? `Last change ${formatDatetime(item.latest_activity_at)}`
      : 'No later activity recorded';

    return {
      label: 'Timeline',
      value: created,
      detail: latest,
    };
  });

  readonly queueSummary = computed(() => {
    const item = this.item();
    if (!item) return { label: 'Context', value: 'Unknown', detail: '' };

    const project = item.primary_project_name ?? 'No project';
    const blockerCount = this.openBlockers().length;
    const questionCount = this.openQuestions().length;

    return {
      label: 'Context',
      value: project,
      detail: `${blockerCount} blocker${blockerCount === 1 ? '' : 's'} · ${questionCount} open question${questionCount === 1 ? '' : 's'}`,
    };
  });

  readonly effectivePriority = computed(() => {
    const i = this.item();
    return i ? effectivePriority(i) : null;
  });

  // In modal mode, update ?detail= so withVaultDetailModal() swaps the dialog
  // body without a full navigation. In page mode, navigate normally so the URL
  // stays meaningful and browser back works as expected.
  swapToSeq(seq: number): void {
    if (this.mode() === 'modal') {
      swapDetailSeq(this.router, seq);
      return;
    }
    this.router.navigate(['/vault-items', seq]);
  }

  onProjectClicked(id: string): void {
    this.router.navigate(['/projects', id]);
  }

  readonly parentItem = computed(() => {
    const i = this.item();
    if (!i?.parent_id) return undefined;
    return this.vaultItemsService.getById(i.parent_id);
  });

  // Compact ref shape for the links-block parent chip — null when standalone.
  readonly parentRef = computed<{ seq: number; title: string } | null>(() => {
    const p = this.parentItem();
    return p ? { seq: p.seq, title: p.title } : null;
  });

  readonly children = computed(() => {
    const i = this.item();
    if (!i) return [];
    return this.vaultItemsService.items()
      .filter(child => child.parent_id === i.id)
      .sort((a, b) => a.seq - b.seq);
  });

  readonly currentActorId = actorId('marvin');

  readonly activeActors = this.actorsService.activeActors;
  readonly activeProjects = this.projectsService.activeProjects;

  readonly actorMap = computed<Record<ActorId, Actor>>(() => {
    const map = {} as Record<ActorId, Actor>;
    for (const a of this.actorsService.actors()) map[a.id] = a;
    return map;
  });

  readonly showRejectForm = signal(false);
  readonly rationaleExpanded = signal(false);

  // Stacked section collapse state. Body starts expanded; activity + thread start collapsed.
  readonly sectionBody     = signal(true);
  readonly sectionActivity = signal(false);
  readonly sectionThread   = signal(false);

  toggleSection(section: 'body' | 'activity' | 'thread'): void {
    if (section === 'body')     this.sectionBody.update(v => !v);
    if (section === 'activity') this.sectionActivity.update(v => !v);
    if (section === 'thread')   this.sectionThread.update(v => !v);
  }

  // Open questions for the current item — rendered above body in their own zone.
  readonly openQuestions = computed(() => {
    const i = this.item();
    if (!i) return [];
    return this.threadService.openQuestionsFor(i.id)();
  });

  onDetailReplyPosted(payload: import('@domain/thread').CreateThreadMessagePayload): void {
    this.threadService.post(payload);
  }

  readonly priorityDiverges = computed(() => {
    const i = this.item();
    if (!i || i.manual_priority == null || i.ai_priority == null) return false;
    return i.manual_priority !== i.ai_priority;
  });

  toggleRationale(): void { this.rationaleExpanded.update(v => !v); }

  // Source from the actors registry — skills (vault-classify, etc.) are NOT
  // actors and never own an item. We list humans and agents that the operator
  // can hand work back to. The kind tag is shown in the dropdown.
  readonly availableActors = computed<RejectActorOption[]>(() =>
    this.activeActors()
      .filter(a => a.kind === 'human' || a.kind === 'agent')
      .map(a => ({ id: a.id, label: a.display_name, kind: a.kind as 'human' | 'agent' }))
  );

  // Reject is only meaningful when there is actual work to review — hide for
  // ungroomed items (nothing to reject) and items already in the rework queue.
  readonly canReject = computed(() => {
    const i = this.item();
    if (!i) return false;
    return i.grooming_status !== 'ungroomed' && i.grooming_status !== 'needs_rework';
  });

  openReject(): void  { this.showRejectForm.set(true); }
  closeReject(): void { this.showRejectForm.set(false); }

  onRejectSubmitted(submission: RejectSubmission): void {
    const i = this.item();
    if (!i) return;
    try {
      this.vaultItemsService.rejectItem(i.id, submission.reason, submission.newOwnerId);
      this.closeReject();
      // Close the modal entirely so the operator returns to the kanban and
      // sees the card has moved to the needs_rework column. In page mode the
      // item still exists at /vault-items/<seq> so we don't navigate away.
      if (this.mode() === 'modal') closeDetail(this.router);
    } catch (err: unknown) {
      // Service throws synchronously on validation failure — UI already guards,
      // so this should never fire. Log for visibility if it does.
      console.error('rejectItem failed', err);
    }
  }
  readonly addBlockerSeqInput = signal('');

  lifecycleOf = lifecycleState;
  isItemArchived = isArchived;

  archive(): void {
    const i = this.item();
    if (!i) return;
    this.vaultItemsService.archive(i.id);
  }

  deleteItem(): void {
    const i = this.item();
    if (!i) return;
    this.vaultItemsService.remove(i.id);
    this.router.navigate(['/vault-items']);
  }

  onStatusChange(next: 'active' | 'done'): void {
    const i = this.item();
    if (!i) return;
    const isCurrentlyDone = i.completed_at !== null;
    const wantDone = next === 'done';
    if (isCurrentlyDone === wantDone) return;
    this.vaultItemsService.setCompleted(i.id, wantDone, null);
  }

  reassign(toActorIdStr: string): void {
    const i = this.item();
    if (!i) return;
    this.vaultItemsService.reassign(i.id, actorId(toActorIdStr), null);
  }

  onEpicToggle(next: boolean): void {
    const i = this.item();
    if (!i) return;
    this.vaultItemsService.setEpic(i.id, next);
  }

  removeProject(pid: string): void {
    const i = this.item();
    if (!i) return;
    this.vaultItemProjectsService.remove(i.id, pid as ProjectId);
  }

  addProject(pidStr: string): void {
    const i = this.item();
    if (!i || !pidStr) return;
    const already = this.junctionProjects().some(j => j.project_id === pidStr);
    if (already) return;
    this.vaultItemProjectsService.add(i.id, projectId(pidStr));
  }

  removeBlocker(blockerIdStr: string): void {
    const i = this.item();
    if (!i) return;
    this.vaultItemDepsService.remove(vaultItemId(blockerIdStr), i.id);
  }

  addBlockerBySeq(): void {
    const i = this.item();
    if (!i) return;
    const seqRaw = this.addBlockerSeqInput().trim();
    const seq = Number(seqRaw);
    if (!seqRaw || isNaN(seq)) return;
    const err = this.vaultItemDepsService.addBySeq(seq, i.id);
    if (err) { this.toast.error(err); return; }
    this.addBlockerSeqInput.set('');
  }

  actorDisplay(actorIdStr: string): string {
    const actor = this.actorsService.getById(actorIdStr as ReturnType<typeof actorId>);
    return actor ? `@${actor.id}` : `@${actorIdStr}`;
  }

  actorKind(actorIdStr: string): 'human' | 'agent' | 'system' {
    const actor = this.actorsService.getById(actorIdStr as ReturnType<typeof actorId>);
    const kind = actor?.kind;
    if (kind === 'human' || kind === 'agent' || kind === 'system') return kind;
    return 'system';
  }

  // Bound arrow functions for passing to <app-activity-log> inputs.
  readonly actorLabelFn = (id: string) => this.actorDisplay(id);
  readonly actorKindFn  = (id: string) => this.actorKind(id);
}
