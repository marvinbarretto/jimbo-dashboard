import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import type { CalendarOptions, EventInput } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import type { VaultItem, Priority } from '@domain/vault/vault-item';
import type { ActorId } from '@domain/ids';
import { effectivePriority } from '@domain/vault/readiness';
import { CURRENT_ACTOR_ID } from '@domain/actors';
import { VAULT_ITEMS_READ } from '@features/vault-items/data-access/vault-items.read';
import { ProjectsService } from '@features/projects/data-access/projects.service';
import { BlockCard } from '@shared/components/block-card/block-card';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { ToastService } from '@shared/components/toast/toast.service';
import { withVaultDetailModal } from '@shared/kanban/detail-modal';
import { JimboSuggestionsService, type SuggestionEvent } from '../../data-access/jimbo-suggestions.service';
import { PlannerSyncService } from '../../data-access/planner-sync.service';
import { WatchQueuePanel } from '../../components/watch-queue-panel/watch-queue-panel';

// Queue candidates: my top-N active tasks by priority (P0 first, unscored
// items sink to the bottom rather than jump the queue), plus anything
// explicitly tagged for planning regardless of rank or assignee — the tag a
// future "plan the week" skill session would set on vault items it wants to
// surface here. No existing tag registry to match, so this is a new
// convention.
const PLANNER_TAG = 'this-week';
const QUEUE_TOP_N = 10;

interface BlockVM {
  readonly id: string; // vault item id
  readonly seq: number; // for the ?detail=<seq> vault item modal
  readonly title: string;
  readonly projectName: string;
  readonly projectColor: string;
  readonly priority: Priority;
  readonly owner: ActorId | null;
  readonly epicLabel: string | null; // parent epic, "↳ #<seq> <title>" — null if standalone
  readonly size: number; // in 25-minute pomodoro blocks
  // Locked applies in the queue too, not just once placed — excluded from
  // randomize-fill and (via the Draggable eventData guard below) can't be
  // dragged onto the calendar until unlocked again.
  readonly locked: boolean;
}

// A block once dropped onto the calendar. `start`/`size`/`locked` are the
// source of truth for placement, duration and lock state — the calendar is a
// rendering of this, not the other way round, so state survives FullCalendar
// re-rendering itself.
interface PlacedBlock extends BlockVM {
  readonly start: string; // ISO
  // The real Google Calendar event this placement is synced to — null until
  // the initial async create() resolves. Lets a later move/resize/lock PATCH
  // the same event instead of creating a duplicate.
  readonly googleEventId: string | null;
}

// randomizeFill's input shape — a BlockVM plus whichever real calendar event
// (if any) it's already synced to, so a re-placed block updates in place
// rather than creating a duplicate.
interface RandomizeCandidate extends BlockVM {
  readonly googleEventId: string | null;
}

interface Interval {
  readonly start: number; // epoch ms
  readonly end: number;
}

type Density = 'comfortable' | 'compact';

// A pomodoro is 25 minutes of work, but it claims a 30-minute slot — the 5
// minutes on the end are the break. That gap is why the planner reckons
// entirely in slots: the row height, the snap, the real event duration and
// every collision/allocation sum are all SLOT_MINUTES. The 25 survives only
// as what a block *means* (block-card's "1×25m" label), never as geometry.
//
// Placing on a 25-minute cadence is what produced start times like 16:10;
// a 30-minute cadence off an on-the-hour window start lands every block on
// a :00 or :30 for free.
const SLOT_MINUTES = 30;

// Randomize-fill searches this daily window. Marvin works day or night, but
// an unbounded search isn't meaningfully more useful than a wide one — keep
// it matched to the visible calendar range (slotMinTime/slotMaxTime below).
const FILL_WINDOW_START = '07:00';
const FILL_WINDOW_END = '22:00';

// Row pixel height per density. FullCalendar doesn't expose a "slot height"
// option directly — it derives event pixel positions from `contentHeight`
// divided across the number of slots, so that (not a CSS override on
// .fc-timegrid-slot, which only repaints the empty grid, not events already
// positioned from FullCalendar's own internal ratio) is the mechanism that
// actually keeps placed events in sync with the grid.
// Bumped up from the pre-ItemHeader values (34/18) — a block-card is now a
// two-row card (item-header strip + title/size body), not a single meta
// row, so a 25-min block needs real room or it renders squished/overlapping
// regardless of how correctly it was actually placed.
const SLOT_PX: Record<Density, number> = { comfortable: 56, compact: 38 };

function totalSlotsInWindow(): number {
  const [startH, startM] = FILL_WINDOW_START.split(':').map(Number);
  const [endH, endM] = FILL_WINDOW_END.split(':').map(Number);
  return ((endH * 60 + endM) - (startH * 60 + startM)) / SLOT_MINUTES;
}

const MINUTES_PER_WEEK = 7 * 24 * 60;

interface ProjectAllocation {
  readonly projectName: string;
  readonly projectColor: string;
  readonly minutes: number;
}

@Component({
  selector: 'app-planner-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FullCalendarModule, BlockCard, UiButton, WatchQueuePanel],
  templateUrl: './planner-page.html',
  styleUrl: './planner-page.scss',
})
export class PlannerPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly suggestions = inject(JimboSuggestionsService);
  private readonly sync = inject(PlannerSyncService);
  private readonly vaultItems = inject(VAULT_ITEMS_READ);
  private readonly projects = inject(ProjectsService);
  private readonly toasts = inject(ToastService);
  private readonly queueEl = viewChild<ElementRef<HTMLElement>>('queueList');
  // Hit-testing target for drag-to-unschedule. Deliberately the whole panel
  // rather than `queueEl`: a collapsed list is display:none, so its rect is
  // all zeros and every drop would miss it. The panel header is on screen
  // either way, so dropping onto a collapsed queue still works.
  private readonly queuePanelEl = viewChild<ElementRef<HTMLElement>>('queuePanel');
  private draggable: Draggable | null = null;

  private readonly weekDates = currentWeekDates();

  constructor() {
    withVaultDetailModal();
  }

  readonly placements = signal<PlacedBlock[]>([]);
  readonly density = signal<Density>('comfortable');
  readonly queueCollapsed = signal(false);
  // True only while a *placed* block is mid-drag. Drives the queue's
  // armed-drop-target styling: drag-to-queue is how you unschedule, but the
  // gesture was completely invisible — nothing on screen said the queue
  // would catch it, so it read as broken rather than undiscovered.
  readonly draggingPlaced = signal(false);
  // Locked-in-queue ids — separate from `placements` since a queue item
  // isn't a PlacedBlock at all; this is the only queue-side state we own
  // locally (everything else in `queue` is derived fresh from vault items).
  private readonly lockedQueueIds = signal<ReadonlySet<string>>(new Set());

  readonly isLoading = this.suggestions.isLoading;
  readonly hasError = this.suggestions.hasError;

  // Candidates: my top-N active tasks ranked by priority, plus anything
  // tagged `this-week` regardless of rank/assignee. Vault items are the
  // source of truth for what exists; `placements` (local-only) tracks where
  // something currently sits, so a placed item simply isn't in queue.
  private readonly candidateItems = computed<VaultItem[]>(() => {
    const tasks = this.vaultItems.activeItems().filter(i => i.type === 'task');
    const tagged = tasks.filter(i => i.tags.includes(PLANNER_TAG));
    const taggedIds = new Set(tagged.map(i => i.id));
    const ranked = tasks
      .filter(i => i.assigned_to === CURRENT_ACTOR_ID && !taggedIds.has(i.id))
      .sort((a, b) => priorityRank(effectivePriority(a)) - priorityRank(effectivePriority(b)))
      .slice(0, QUEUE_TOP_N);
    return [...tagged, ...ranked];
  });

  readonly queue = computed<BlockVM[]>(() => {
    const placedIds = new Set(this.placements().map(p => p.id));
    const lockedIds = this.lockedQueueIds();
    return this.candidateItems()
      .filter(i => !placedIds.has(i.id))
      .map(i => ({ ...this.toBlockVM(i), locked: lockedIds.has(i.id) }));
  });

  // Slot minutes, not work minutes — this is "how much calendar do I still
  // need to find", and a queued block needs its break time booked too.
  readonly queuedMinutes = computed(() => this.queue().reduce((sum, b) => sum + b.size, 0) * SLOT_MINUTES);
  readonly lockedCount = computed(() =>
    this.placements().filter(b => b.locked).length + this.queue().filter(b => b.locked).length,
  );

  // ── Week metrics ──────────────────────────────────────────────────────────
  // "Busy" counts real committed time — placed blocks plus genuine Jimbo
  // suggestions (not our own synced placements, already counted via
  // `placements`). "Free" is remaining capacity inside the work window
  // (07:00-22:00); "downtime" is the much bigger number of the week that
  // isn't work hours at all — sleep, evenings, weekends. Two different
  // questions ("is my work day full?" vs "how much of my week is mine?"),
  // not the same number reframed.
  private readonly windowMinutes = totalSlotsInWindow() * SLOT_MINUTES * 7;

  readonly busyMinutes = computed(() => {
    const suggestionMinutes = this.suggestions.events()
      .filter(ev => !this.sync.isOurs(ev))
      .reduce((sum, ev) => sum + minutesOf(toInterval(ev)), 0);
    const placedMinutes = this.placements().reduce((sum, b) => sum + b.size * SLOT_MINUTES, 0);
    return suggestionMinutes + placedMinutes;
  });

  readonly freeMinutes = computed(() => Math.max(0, this.windowMinutes - this.busyMinutes()));
  readonly downtimeMinutes = computed(() => Math.max(0, MINUTES_PER_WEEK - this.busyMinutes()));

  // Only placed blocks count — a queued item hasn't actually claimed any
  // calendar time yet, so it shouldn't read as "allocated".
  readonly projectAllocations = computed<ProjectAllocation[]>(() => {
    const byProject = new Map<string, ProjectAllocation>();
    for (const b of this.placements()) {
      const existing = byProject.get(b.projectName);
      const minutes = b.size * SLOT_MINUTES;
      byProject.set(b.projectName, existing
        ? { ...existing, minutes: existing.minutes + minutes }
        : { projectName: b.projectName, projectColor: b.projectColor, minutes });
    }
    return [...byProject.values()].sort((a, b) => b.minutes - a.minutes);
  });

  // Events the planner itself previously synced render via `placements`
  // (a real app-block-card) instead of the plain read-only suggestion-card —
  // excluded here so they don't render twice.
  private readonly events = computed<EventInput[]>(() => [
    ...this.suggestions.events().filter(ev => !this.sync.isOurs(ev)).map(toSuggestionEventInput),
    ...this.placements().map(toBlockEventInput),
  ]);

  readonly calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    headerToolbar: { left: '', center: 'title', right: '' },
    contentHeight: totalSlotsInWindow() * SLOT_PX[this.density()],
    // contentHeight alone only sets the scroll container's height — rows
    // keep FullCalendar's own default height and the extra space becomes
    // blank scroll area. expandRows makes it actually stretch each row (and
    // therefore reposition events, which are computed from row height) to
    // fill that height.
    expandRows: true,
    // The calendar now lives in its own internally-scrolling box (see
    // .calendar in the SCSS) — keep the day-name header pinned while the
    // tall grid scrolls underneath it.
    stickyHeaderDates: true,
    firstDay: 1,
    nowIndicator: true,
    slotDuration: `00:${SLOT_MINUTES}:00`,
    snapDuration: `00:${SLOT_MINUTES}:00`,
    slotMinTime: `${FILL_WINDOW_START}:00`,
    slotMaxTime: `${FILL_WINDOW_END}:00`,
    editable: true,
    droppable: true,
    eventResizableFromStart: true,
    // Same-time events get their own column instead of FullCalendar's default
    // cascading stack, which rendered overlapping events' time labels nearly
    // on top of each other.
    slotEventOverlap: false,
    events: this.events(),

    // External queue item dropped onto the grid — remove FullCalendar's own
    // event and re-add via our signal so `events` (computed above) stays the
    // single source of truth rather than forking state into FullCalendar's
    // internal store.
    eventReceive: (info) => {
      const blockId = info.event.extendedProps['blockId'] as string | undefined;
      info.event.remove();
      if (!blockId) return;
      const block = this.queue().find(b => b.id === blockId);
      if (!block || !info.event.start) return;
      const newBlock: PlacedBlock = {
        ...block,
        start: info.event.start.toISOString(),
        locked: false,
        googleEventId: null,
      };
      this.placements.update(p => [...p, newBlock]);
      void this.syncCreate(newBlock);
    },

    // Drag an already-placed block's edge — duration change, in whole
    // pomodoro blocks (snapDuration above already snaps the drag itself;
    // this just reads the result back into `size`).
    eventResize: (info) => {
      const blockId = info.event.extendedProps['blockId'] as string | undefined;
      if (!blockId || !info.event.start || !info.event.end) return;
      const ms = info.event.end.getTime() - info.event.start.getTime();
      const size = Math.max(1, Math.round(ms / (SLOT_MINUTES * 60_000)));
      this.updatePlacement(blockId, b => ({ ...b, size }));
    },

    // Drag an already-placed block to a different day/time.
    eventDrop: (info) => {
      const blockId = info.event.extendedProps['blockId'] as string | undefined;
      if (!blockId || !info.event.start) return;
      const start = info.event.start.toISOString();
      this.updatePlacement(blockId, b => ({ ...b, start }));
    },

    eventDragStart: (info) => {
      if (info.event.extendedProps['blockId']) this.draggingPlaced.set(true);
    },

    // Drag an already-placed block back onto the queue list — unplace it.
    // Checked here rather than eventDrop: eventDrop only fires for a drop
    // that resolves to a valid calendar position, so dropping outside the
    // grid entirely (over the queue) reverts and skips it. eventDragStop
    // fires either way, so it's the only hook that can catch this.
    eventDragStop: (info) => {
      // Cleared first and unconditionally — every early return below would
      // otherwise strand the queue in its armed state until the next drag.
      this.draggingPlaced.set(false);
      const blockId = info.event.extendedProps['blockId'] as string | undefined;
      if (!blockId) return;
      const queueRect = this.queuePanelEl()?.nativeElement.getBoundingClientRect();
      if (!queueRect) return;
      const { clientX, clientY } = info.jsEvent as MouseEvent;
      const overQueue = clientX >= queueRect.left && clientX <= queueRect.right
        && clientY >= queueRect.top && clientY <= queueRect.bottom;
      if (overQueue) this.unplace(blockId);
    },

    // No eventClick handler — locking is now BlockCard's own lock-icon click
    // (see planner-page.html's (lockToggle) binding), so a click on the
    // title can open the vault item modal instead without the two fighting
    // over the same click.
  }));

  async ngOnInit(): Promise<void> {
    await this.suggestions.load();
    this.reconcileFromSuggestions();
  }

  // Runs once after the initial load: events the planner previously synced
  // (carrying our extendedProperties marker) get promoted from the read-only
  // suggestions feed into real placements, so a page reload doesn't forget
  // what's already scheduled.
  private reconcileFromSuggestions(): void {
    const reconciled = this.sync.reconcileAll(this.suggestions.events());
    if (!reconciled.length) return;
    const known = new Set(this.placements().map(b => b.googleEventId));
    const fresh = reconciled.filter(b => !known.has(b.googleEventId));
    if (!fresh.length) return;
    this.placements.update(p => [...p, ...fresh]);
  }

  ngAfterViewInit(): void {
    const el = this.queueEl()?.nativeElement;
    if (!el) return;
    this.draggable = new Draggable(el, {
      // The `:not()` is the real lock gate: FullCalendar resolves the drag
      // subject with elementClosest(target, itemSelector), so a locked card
      // is never picked up at all. Previously it was gated in eventData
      // below, which let you drag a locked card the whole way and then
      // silently refused to land it — a drag that looks live and does
      // nothing reads as a bug, not as a lock.
      itemSelector: '.block-card:not(.block-card--locked)',
      eventData: (el) => {
        const blockId = el.getAttribute('data-block-id');
        const block = this.queue().find(b => b.id === blockId);
        // Belt-and-braces behind itemSelector: eventReceive's own guard
        // bails without placing when blockId is absent.
        if (!block || block.locked) return {};
        // Full extendedProps, not just blockId — FullCalendar renders this
        // via our own eventContent template immediately on drop, before
        // eventReceive gets a chance to replace it with the real placement.
        // Sending a partial payload here previously rendered momentarily
        // with undefined projectName/priority/etc — harmless with the old
        // plain-text template, but app-project-avatar's initials computation
        // throws on an undefined name, so it needs to be complete.
        return {
          title: block.title,
          duration: { minutes: block.size * SLOT_MINUTES },
          extendedProps: {
            blockId: block.id,
            seq: block.seq,
            locked: false,
            projectName: block.projectName,
            projectColor: block.projectColor,
            priority: block.priority,
            owner: block.owner,
            epicLabel: block.epicLabel,
            size: block.size,
          },
        };
      },
    });
  }

  ngOnDestroy(): void {
    this.draggable?.destroy();
  }

  setDensity(d: Density): void {
    this.density.set(d);
  }

  toggleQueueCollapsed(): void {
    this.queueCollapsed.update(v => !v);
  }

  protected fmtDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  toggleLock(blockId: string): void {
    this.updatePlacement(blockId, b => ({ ...b, locked: !b.locked }));
  }

  // Drag-out-to-queue and any other "take this off the calendar" action
  // funnel through here — drops the placement (it reappears in `queue`,
  // a pure computed, on its own) and deletes the real event if it had one.
  unplace(blockId: string): void {
    const block = this.placements().find(b => b.id === blockId);
    if (!block) return;
    this.placements.update(p => p.filter(b => b.id !== blockId));
    if (block.googleEventId) void this.sync.remove(block.googleEventId);
    this.offerUndo([block], `Unscheduled “${block.title}”`);
  }

  // Bulk undo for randomize: every unlocked placement comes off the calendar
  // and back into the queue in one press. Locked blocks stay put — same
  // contract as randomize itself.
  clearUnlocked(): void {
    const unlocked = this.placements().filter(b => !b.locked);
    if (!unlocked.length) return;
    this.placements.update(p => p.filter(b => b.locked));
    for (const b of unlocked) if (b.googleEventId) void this.sync.remove(b.googleEventId);
    this.offerUndo(unlocked, `${unlocked.length} block${unlocked.length === 1 ? '' : 's'} unscheduled`);
  }

  // Undo exists for Clear and drag-to-unschedule specifically because, unlike
  // Randomize, repeating them doesn't get you back — they delete real
  // calendar events, and the placement they destroyed is unrecoverable once
  // the toast lapses.
  private offerUndo(blocks: readonly PlacedBlock[], message: string): void {
    this.toasts.actionable(message, { label: 'Undo', run: () => this.restore(blocks) });
  }

  private restore(blocks: readonly PlacedBlock[]): void {
    // Anything already back on the board under the same id — re-placed by a
    // Randomize in the meantime, say — is skipped rather than duplicated.
    const present = new Set(this.placements().map(b => b.id));
    // googleEventId is dropped on the way in: those events were deleted when
    // the block was unscheduled, so each restored block needs a fresh one.
    const restored = blocks
      .filter(b => !present.has(b.id))
      .map(b => ({ ...b, googleEventId: null }));
    if (!restored.length) return;
    this.placements.update(p => [...p, ...restored]);
    for (const b of restored) void this.syncCreate(b);
  }

  // Applies a local edit to a placement and, if it's already synced to a
  // real calendar event, PATCHes that event to match — the two paths that
  // change a placement in place (drag, resize, lock) all go through this.
  private updatePlacement(blockId: string, fn: (b: PlacedBlock) => PlacedBlock): void {
    let updated: PlacedBlock | undefined;
    this.placements.update(p => p.map(b => {
      if (b.id !== blockId) return b;
      updated = fn(b);
      return updated;
    }));
    if (updated?.googleEventId) void this.sync.update(updated.googleEventId, updated);
  }

  // Fire-and-update: create the real event, then attach its id once the
  // call resolves so the next edit PATCHes instead of creating a duplicate.
  private async syncCreate(block: PlacedBlock): Promise<void> {
    const googleEventId = await this.sync.create(block);
    if (!googleEventId) return;
    this.placements.update(p => p.map(b => (b.id === block.id ? { ...b, googleEventId } : b)));
  }

  toggleQueueLock(id: string): void {
    this.lockedQueueIds.update(ids => {
      const next = new Set(ids);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Locked placements/queue items + the real Jimbo Suggestions events are
  // fixed obstacles. Everything else — the unlocked queue, and any unlocked
  // placement — is pooled and re-scattered into open slots.
  randomize(): void {
    const lockedPlacements = this.placements().filter(b => b.locked);
    const unlockedPlacements = this.placements().filter(b => !b.locked);
    // googleEventId rides along so a block that lands again still updates
    // its existing event instead of creating a duplicate.
    const unlockedAsBlocks: RandomizeCandidate[] = unlockedPlacements
      .map(({ id, seq, title, projectName, projectColor, priority, owner, epicLabel, size, googleEventId }) => ({
        id, seq, title, projectName, projectColor, priority, owner, epicLabel, size, locked: false, googleEventId,
      }));
    const queueAsBlocks: RandomizeCandidate[] = this.queue()
      .filter(b => !b.locked)
      .map(b => ({ ...b, googleEventId: null }));
    const candidates = [...queueAsBlocks, ...unlockedAsBlocks];

    const fixed: Interval[] = [
      ...this.suggestions.events().map(toInterval),
      ...lockedPlacements.map(placedToInterval),
    ];

    const { placed } = randomizeFill(candidates, fixed, this.weekDates);
    // `unplaced` needs no handling — anything not placed simply isn't in
    // `placements`, so it reappears in `queue` (a pure computed) on its own.
    this.placements.set([...lockedPlacements, ...placed]);

    // Anything that was synced but didn't make it back into `placed` this
    // round is now an orphaned real event — nothing local points at it.
    const placedIds = new Set(placed.map(b => b.id));
    const orphaned = unlockedPlacements.filter(b => b.googleEventId && !placedIds.has(b.id));
    for (const b of orphaned) void this.sync.remove(b.googleEventId!);

    for (const block of placed) {
      if (block.googleEventId) void this.sync.update(block.googleEventId, block);
      else void this.syncCreate(block);
    }
  }

  // Recalibrate ≠ randomize. Randomize reshuffles everything unlocked from
  // scratch, whether it still needs it or not — good for "fill the board".
  // Recalibrate corrects drift since the plan was made: a placement whose
  // vault item was completed/archived elsewhere is cleared (and its synced
  // event deleted); a placement whose slot has already passed and is still
  // undone gets moved forward to the next open slot. Everything else —
  // future placements, whether locked or not — is left exactly where it is.
  recalibrate(): void {
    const now = Date.now();
    const activeIds = new Set<string>(this.vaultItems.activeItems().map(i => i.id));

    const stale = this.placements().filter(b => !activeIds.has(b.id));
    const missed = this.placements().filter(
      b => activeIds.has(b.id) && !b.locked && new Date(b.start).getTime() < now,
    );
    const missedIds = new Set(missed.map(b => b.id));
    const current = this.placements().filter(b => activeIds.has(b.id) && !missedIds.has(b.id));

    for (const b of stale) if (b.googleEventId) void this.sync.remove(b.googleEventId);

    const fixed: Interval[] = [
      ...this.suggestions.events().filter(ev => !this.sync.isOurs(ev)).map(toInterval),
      ...current.map(placedToInterval),
    ];
    const { placed: rescheduled } = randomizeFill(missed, fixed, this.weekDates);
    // Unplaced missed items need no handling — they're simply not in
    // `placements`, so they reappear in `queue` (a pure computed) on their
    // own, same as anything randomize couldn't fit.

    this.placements.set([...current, ...rescheduled]);

    for (const block of rescheduled) {
      if (block.googleEventId) void this.sync.update(block.googleEventId, block);
      else void this.syncCreate(block);
    }
  }

  private toBlockVM(item: VaultItem): BlockVM {
    const parent = item.parent_id ? this.vaultItems.getById(item.parent_id) : undefined;
    return {
      id: item.id,
      seq: item.seq,
      title: item.title,
      projectName: item.primary_project_name ?? 'No project',
      projectColor: this.colorForProject(item.primary_project_id),
      priority: effectivePriority(item) ?? 3,
      owner: item.assigned_to,
      epicLabel: parent ? `↳ #${parent.seq} ${parent.title}` : null,
      size: item.estimated_blocks ?? 1,
      locked: false, // overridden by the `queue` computed from lockedQueueIds
    };
  }

  private colorForProject(projectId: string | null | undefined): string {
    if (!projectId) return 'var(--color-text-muted)';
    const project = this.projects.activeProjects().find(p => p.id === projectId);
    return project?.color_token || 'var(--color-accent)';
  }
}

// Unscored items (null) sink to the bottom rather than jumping the queue —
// "not yet triaged" shouldn't outrank something explicitly scored P3.
function priorityRank(p: Priority | null): number {
  return p ?? 99;
}

// ── Calendar ↔ state mapping ────────────────────────────────────────────────

function toSuggestionEventInput(ev: SuggestionEvent): EventInput {
  return {
    id: `sugg-${ev.id}`,
    title: ev.title,
    start: ev.start,
    end: ev.end ?? undefined,
    allDay: ev.allDay,
    editable: false,
    classNames: ['fc-suggestion'],
  };
}

function toBlockEventInput(b: PlacedBlock): EventInput {
  const start = new Date(b.start);
  const end = new Date(start.getTime() + b.size * SLOT_MINUTES * 60_000);
  return {
    id: b.id,
    title: b.title,
    start: b.start,
    end: end.toISOString(),
    editable: !b.locked,
    classNames: ['fc-block', ...(b.locked ? ['fc-block--locked'] : [])],
    extendedProps: {
      blockId: b.id,
      seq: b.seq,
      locked: b.locked,
      projectName: b.projectName,
      projectColor: b.projectColor,
      priority: b.priority,
      owner: b.owner,
      epicLabel: b.epicLabel,
      size: b.size,
    },
  };
}

// ── Randomize-fill ──────────────────────────────────────────────────────────

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

function randomizeFill(
  candidates: readonly RandomizeCandidate[],
  fixed: readonly Interval[],
  weekDates: readonly string[],
): { placed: PlacedBlock[]; unplaced: RandomizeCandidate[] } {
  const busy = [...fixed];
  const placed: PlacedBlock[] = [];
  const unplaced: RandomizeCandidate[] = [];

  for (const block of shuffle(candidates)) {
    const durationMs = block.size * SLOT_MINUTES * 60_000;
    let placedOk = false;

    for (const date of shuffle(weekDates)) {
      const dayStart = new Date(`${date}T${FILL_WINDOW_START}:00`).getTime();
      const dayEnd = new Date(`${date}T${FILL_WINDOW_END}:00`).getTime();
      const candidateStarts: number[] = [];
      // Stepping by SLOT_MINUTES from an on-the-hour window start is what
      // guarantees every candidate start is a :00 or :30.
      for (let t = dayStart; t + durationMs <= dayEnd; t += SLOT_MINUTES * 60_000) candidateStarts.push(t);

      for (const slotStart of shuffle(candidateStarts)) {
        const slot: Interval = { start: slotStart, end: slotStart + durationMs };
        if (!busy.some(iv => overlaps(iv, slot))) {
          busy.push(slot);
          placed.push({ ...block, start: new Date(slotStart).toISOString(), locked: false });
          placedOk = true;
          break;
        }
      }
      if (placedOk) break;
    }

    if (!placedOk) unplaced.push(block);
  }

  return { placed, unplaced };
}

function toInterval(ev: SuggestionEvent): Interval {
  if (ev.allDay) {
    const start = new Date(`${ev.start}T00:00:00`).getTime();
    const end = ev.end ? new Date(`${ev.end}T00:00:00`).getTime() : start + 86_400_000;
    return { start, end };
  }
  const start = new Date(ev.start).getTime();
  const end = ev.end ? new Date(ev.end).getTime() : start + 30 * 60_000;
  return { start, end };
}

function minutesOf(iv: Interval): number {
  return (iv.end - iv.start) / 60_000;
}

function placedToInterval(b: PlacedBlock): Interval {
  const start = new Date(b.start).getTime();
  return { start, end: start + b.size * SLOT_MINUTES * 60_000 };
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function currentWeekDates(): string[] {
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7; // days since the most recent Monday
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return toDateKey(d);
  });
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
