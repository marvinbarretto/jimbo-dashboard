import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { VaultItemsService } from '../../data-access/vault-items.service';
import { ActivityEventsService } from '../../data-access/activity-events.service';
import { VaultItemProjectsService } from '../../data-access/vault-item-projects.service';
import { VaultItemDependenciesService } from '../../data-access/vault-item-dependencies.service';
import { ActorsService } from '../../../actors/data-access/actors.service';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import { ThreadService } from '../../../thread/data-access/thread.service';
import { ThreadView } from '../../../thread/components/thread-view/thread-view';
import { computeReadiness, effectivePriority } from '@domain/vault/readiness';
import { actorId, projectId, vaultItemId } from '@domain/ids';
import type { Priority } from '@domain/vault/vault-item';
import { lifecycleState, isArchived } from '@domain/vault/vault-item';
import type { ActivityEvent, AssignedEvent, CompletionChangedEvent, ArchivedEvent, GroomingStatusChangedEvent, ThreadMessagePostedEvent } from '@domain/activity/activity-event';
import type { ProjectId, ActorId } from '@domain/ids';
import type { Actor } from '@domain/actors';

@Component({
  selector: 'app-vault-item-detail-body',
  imports: [RouterLink, ThreadView],
  templateUrl: './vault-item-detail-body.html',
  styleUrl: './vault-item-detail-body.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultItemDetailBody {
  readonly seq = input.required<number>();
  // 'page' shows the in-bar × back-to-vault link; 'modal' hides it because the
  // dialog shell provides its own close affordance.
  readonly mode = input<'page' | 'modal'>('page');

  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly activityService = inject(ActivityEventsService);
  private readonly vaultItemProjectsService = inject(VaultItemProjectsService);
  private readonly vaultItemDepsService = inject(VaultItemDependenciesService);
  private readonly actorsService = inject(ActorsService);
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

  readonly owner = computed(() => {
    const i = this.item();
    if (!i?.assigned_to) return undefined;
    return this.actorsService.getById(i.assigned_to);
  });

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

  readonly effectivePriority = computed(() => {
    const i = this.item();
    return i ? effectivePriority(i) : null;
  });

  priorityLabel(p: Priority | null): string {
    return p === null ? '—' : 'P' + p;
  }

  readonly parentItem = computed(() => {
    const i = this.item();
    if (!i?.parent_id) return undefined;
    return this.vaultItemsService.getById(i.parent_id);
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

  readonly showReassignPicker = signal(false);
  readonly showAddProjectPicker = signal(false);
  readonly addBlockerSeqInput = signal('');

  readonly statuses: ('active' | 'done')[] = ['active', 'done'];

  lifecycleOf = lifecycleState;
  isItemArchived = isArchived;

  archive(): void {
    const i = this.item();
    if (!i) return;
    if (!confirm(`Archive #${i.seq} — ${i.title}?`)) return;
    this.vaultItemsService.archive(i.id);
  }

  deleteItem(): void {
    const i = this.item();
    if (!i) return;
    if (!confirm(`Permanently delete #${i.seq} — ${i.title}? This cannot be undone.`)) return;
    this.vaultItemsService.remove(i.id);
  }

  onStatusChange(event: Event): void {
    const i = this.item();
    if (!i) return;
    const next = (event.target as HTMLSelectElement).value as 'active' | 'done';
    const isCurrentlyDone = i.completed_at !== null;
    const wantDone = next === 'done';
    if (isCurrentlyDone === wantDone) return;
    this.vaultItemsService.setCompleted(i.id, wantDone, null);
  }

  toggleReassignPicker(): void {
    this.showReassignPicker.update(v => !v);
  }

  reassign(toActorIdStr: string): void {
    const i = this.item();
    if (!i) return;
    this.vaultItemsService.reassign(i.id, actorId(toActorIdStr), null);
    this.showReassignPicker.set(false);
  }

  removeProject(pid: ProjectId): void {
    const i = this.item();
    if (!i) return;
    this.vaultItemProjectsService.remove(i.id, pid);
  }

  toggleAddProjectPicker(): void {
    this.showAddProjectPicker.update(v => !v);
  }

  addProject(pidStr: string): void {
    const i = this.item();
    if (!i || !pidStr) return;
    const already = this.junctionProjects().some(j => j.project_id === pidStr);
    if (already) { this.showAddProjectPicker.set(false); return; }
    this.vaultItemProjectsService.add(i.id, projectId(pidStr));
    this.showAddProjectPicker.set(false);
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
    const blocker = this.vaultItemsService.getBySeq(seq);
    if (!blocker) { alert(`#${seq} not found.`); return; }
    if (blocker.id === i.id) { alert('An item cannot block itself.'); return; }
    this.vaultItemDepsService.add(blocker.id, i.id);
    this.addBlockerSeqInput.set('');
  }

  onBlockerSeqInput(event: Event): void {
    this.addBlockerSeqInput.set((event.target as HTMLInputElement).value);
  }

  actorDisplay(actorIdStr: string): string {
    const actor = this.actorsService.getById(actorIdStr as ReturnType<typeof actorId>);
    return actor ? `@${actor.id}` : `@${actorIdStr}`;
  }

  actorKind(actorIdStr: string): string {
    const actor = this.actorsService.getById(actorIdStr as ReturnType<typeof actorId>);
    return actor?.kind ?? 'human';
  }

  eventDescription(event: ActivityEvent): string {
    switch (event.type) {
      case 'created':
        return 'created this item';
      case 'assigned': {
        const e = event as AssignedEvent;
        const from = e.from_actor_id ? this.actorDisplay(e.from_actor_id) : null;
        const to = this.actorDisplay(e.to_actor_id);
        return from ? `assigned ${from} → ${to}` : `assigned → ${to}`;
      }
      case 'completion_changed': {
        const e = event as CompletionChangedEvent;
        const note = e.note ? ` (${e.note})` : '';
        if (e.to !== null && e.from === null) return `marked done${note}`;
        if (e.to === null && e.from !== null) return `un-marked done${note}`;
        return `completion changed${note}`;
      }
      case 'archived': {
        const e = event as ArchivedEvent;
        const note = e.note ? ` (${e.note})` : '';
        return `archived${note}`;
      }
      case 'unarchived': {
        return 'unarchived';
      }
      case 'grooming_status_changed': {
        const e = event as GroomingStatusChangedEvent;
        const note = e.note ? ` (${e.note})` : '';
        return `grooming: ${e.from.replace('_', ' ')} → ${e.to.replace('_', ' ')}${note}`;
      }
      case 'thread_message_posted': {
        const e = event as ThreadMessagePostedEvent;
        return `posted ${e.message_kind}`;
      }
      default:
        return event.type;
    }
  }

  relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }
}
