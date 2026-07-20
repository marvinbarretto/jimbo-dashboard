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
import { effectivePriority } from '@domain/vault/readiness';
import { CURRENT_ACTOR_ID } from '@domain/actors';
import { VAULT_ITEMS_READ } from '@features/vault-items/data-access/vault-items.read';
import { ProjectsService } from '@features/projects/data-access/projects.service';
import { BlockCard } from '@shared/components/block-card/block-card';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { withVaultDetailModal } from '@shared/kanban/detail-modal';
import { JimboSuggestionsService, type SuggestionEvent } from '../../data-access/jimbo-suggestions.service';

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
  readonly size: number; // in 25-minute pomodoro blocks
}

// A block once dropped onto the calendar. `start`/`size`/`locked` are the
// source of truth for placement, duration and lock state — the calendar is a
// rendering of this, not the other way round, so state survives FullCalendar
// re-rendering itself. Locked blocks are excluded from randomize-fill and
// made non-draggable/non-resizable on the calendar itself.
interface PlacedBlock extends BlockVM {
  readonly start: string; // ISO
  readonly locked: boolean;
}

interface Interval {
  readonly start: number; // epoch ms
  readonly end: number;
}

type Density = 'comfortable' | 'compact';

const BLOCK_MINUTES = 25;

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
const SLOT_PX: Record<Density, number> = { comfortable: 34, compact: 18 };

function totalSlotsInWindow(): number {
  const [startH, startM] = FILL_WINDOW_START.split(':').map(Number);
  const [endH, endM] = FILL_WINDOW_END.split(':').map(Number);
  return ((endH * 60 + endM) - (startH * 60 + startM)) / BLOCK_MINUTES;
}

@Component({
  selector: 'app-planner-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FullCalendarModule, BlockCard, UiButton],
  templateUrl: './planner-page.html',
  styleUrl: './planner-page.scss',
})
export class PlannerPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly suggestions = inject(JimboSuggestionsService);
  private readonly vaultItems = inject(VAULT_ITEMS_READ);
  private readonly projects = inject(ProjectsService);
  private readonly queueEl = viewChild<ElementRef<HTMLElement>>('queueList');
  private draggable: Draggable | null = null;

  private readonly weekDates = currentWeekDates();

  constructor() {
    withVaultDetailModal();
  }

  readonly placements = signal<PlacedBlock[]>([]);
  readonly density = signal<Density>('comfortable');

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
    return this.candidateItems()
      .filter(i => !placedIds.has(i.id))
      .map(i => this.toBlockVM(i));
  });

  readonly queuedMinutes = computed(() => this.queue().reduce((sum, b) => sum + b.size, 0) * BLOCK_MINUTES);
  readonly lockedCount = computed(() => this.placements().filter(b => b.locked).length);

  private readonly events = computed<EventInput[]>(() => [
    ...this.suggestions.events().map(toSuggestionEventInput),
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
    firstDay: 1,
    nowIndicator: true,
    slotDuration: `00:${BLOCK_MINUTES}:00`,
    snapDuration: `00:${BLOCK_MINUTES}:00`,
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
      this.placements.update(p => [...p, { ...block, start: info.event.start!.toISOString(), locked: false }]);
    },

    // Drag an already-placed block's edge — duration change, in whole
    // pomodoro blocks (snapDuration above already snaps the drag itself;
    // this just reads the result back into `size`).
    eventResize: (info) => {
      const blockId = info.event.extendedProps['blockId'] as string | undefined;
      if (!blockId || !info.event.start || !info.event.end) return;
      const ms = info.event.end.getTime() - info.event.start.getTime();
      const size = Math.max(1, Math.round(ms / (BLOCK_MINUTES * 60_000)));
      this.placements.update(p => p.map(b => (b.id === blockId ? { ...b, size } : b)));
    },

    // Drag an already-placed block to a different day/time.
    eventDrop: (info) => {
      const blockId = info.event.extendedProps['blockId'] as string | undefined;
      if (!blockId || !info.event.start) return;
      const start = info.event.start.toISOString();
      this.placements.update(p => p.map(b => (b.id === blockId ? { ...b, start } : b)));
    },

    // No eventClick handler — locking is now BlockCard's own lock-icon click
    // (see planner-page.html's (lockToggle) binding), so a click on the
    // title can open the vault item modal instead without the two fighting
    // over the same click.
  }));

  ngOnInit(): void {
    void this.suggestions.load();
  }

  ngAfterViewInit(): void {
    const el = this.queueEl()?.nativeElement;
    if (!el) return;
    this.draggable = new Draggable(el, {
      itemSelector: '.block-card',
      eventData: (el) => {
        const blockId = el.getAttribute('data-block-id');
        const block = this.queue().find(b => b.id === blockId);
        if (!block) return {};
        return {
          title: block.title,
          duration: { minutes: block.size * BLOCK_MINUTES },
          extendedProps: { blockId: block.id },
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

  toggleLock(blockId: string): void {
    this.placements.update(p => p.map(b => (b.id === blockId ? { ...b, locked: !b.locked } : b)));
  }

  // Locked placements + the real Jimbo Suggestions events are fixed
  // obstacles. Everything else — the queue, and any unlocked placement — is
  // pooled and re-scattered into open slots. Locked blocks are never moved.
  randomize(): void {
    const lockedPlacements = this.placements().filter(b => b.locked);
    const unlockedAsBlocks: BlockVM[] = this.placements()
      .filter(b => !b.locked)
      .map(({ id, seq, title, projectName, projectColor, priority, size }) => ({
        id, seq, title, projectName, projectColor, priority, size,
      }));
    const candidates = [...this.queue(), ...unlockedAsBlocks];

    const fixed: Interval[] = [
      ...this.suggestions.events().map(toInterval),
      ...lockedPlacements.map(placedToInterval),
    ];

    const { placed } = randomizeFill(candidates, fixed, this.weekDates);
    // `unplaced` needs no handling — anything not placed simply isn't in
    // `placements`, so it reappears in `queue` (a pure computed) on its own.
    this.placements.set([...lockedPlacements, ...placed]);
  }

  private toBlockVM(item: VaultItem): BlockVM {
    return {
      id: item.id,
      seq: item.seq,
      title: item.title,
      projectName: item.primary_project_name ?? 'No project',
      projectColor: this.colorForProject(item.primary_project_id),
      priority: effectivePriority(item) ?? 3,
      size: 1,
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
  const end = new Date(start.getTime() + b.size * BLOCK_MINUTES * 60_000);
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
      size: b.size,
    },
  };
}

// ── Randomize-fill ──────────────────────────────────────────────────────────

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

function randomizeFill(
  candidates: readonly BlockVM[],
  fixed: readonly Interval[],
  weekDates: readonly string[],
): { placed: PlacedBlock[]; unplaced: BlockVM[] } {
  const busy = [...fixed];
  const placed: PlacedBlock[] = [];
  const unplaced: BlockVM[] = [];

  for (const block of shuffle(candidates)) {
    const durationMs = block.size * BLOCK_MINUTES * 60_000;
    let placedOk = false;

    for (const date of shuffle(weekDates)) {
      const dayStart = new Date(`${date}T${FILL_WINDOW_START}:00`).getTime();
      const dayEnd = new Date(`${date}T${FILL_WINDOW_END}:00`).getTime();
      const candidateStarts: number[] = [];
      for (let t = dayStart; t + durationMs <= dayEnd; t += BLOCK_MINUTES * 60_000) candidateStarts.push(t);

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

function placedToInterval(b: PlacedBlock): Interval {
  const start = new Date(b.start).getTime();
  return { start, end: start + b.size * BLOCK_MINUTES * 60_000 };
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
