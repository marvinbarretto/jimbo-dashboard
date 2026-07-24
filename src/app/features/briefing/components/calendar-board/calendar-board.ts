import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { httpResource, HttpClient } from '@angular/common/http';
import { CdkDropList, CdkDrag, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';
import { PlannerSyncService } from '../../../planner/data-access/planner-sync.service';
import { BriefingFeedback } from '../../../briefings/components/briefing-feedback/briefing-feedback';
import { BlockCard } from '@shared/components/block-card/block-card';
import { VAULT_ITEMS_READ } from '@features/vault-items/data-access/vault-items.read';
import { ProjectsService } from '@features/projects/data-access/projects.service';
import { effectivePriority } from '@domain/vault/readiness';
import type { Priority } from '@domain/vault/vault-item';
import type { ActorId } from '@domain/ids';
import { CALENDAR_BOARD_COLUMNS, type BoardColumnConfig } from './calendar-board.config';
import { dateKey, shiftIsoDays } from './calendar-board.utils';
import type { SuggestedBlock } from '../../../briefings/data-access/briefing.types';

// A suggested_block resolved to a real vault item — the shape block-card + the
// round-trippable PlannerSyncService.create both need.
interface VaultBlockView {
  id: string;
  seq: number;
  title: string;
  projectName: string;
  projectColor: string;
  priority: Priority;
  owner: ActorId | null;
  epicLabel: string | null;
  size: number;
  start: string | null;
  timeText: string | null;
}

interface ResolvedBlock {
  blk: SuggestedBlock;
  vault: VaultBlockView | null;
}

interface RawCalEvent {
  readonly id: string;
  readonly summary?: string;
  readonly start: { readonly dateTime?: string; readonly date?: string };
  readonly end: { readonly dateTime?: string; readonly date?: string };
}

interface BoardEvent {
  id: string;
  title: string;
  /** 'HH:mm', or null for all-day. */
  time: string | null;
  allDay: boolean;
  past: boolean;
  sortKey: string;
  // Write coordinates for defer — which calendar/account this event lives on,
  // and its raw ISO bounds so a defer can shift them by whole days.
  calendarId: string;
  account: string;
  rawStart: string | null;
  rawEnd: string | null;
}

interface BoardDay {
  events: BoardEvent[];
  failed: boolean;
}

interface BoardColumn {
  config: BoardColumnConfig;
  loading: boolean;
  today: BoardDay;
  tomorrow: BoardDay;
}

// Read-mostly today/tomorrow board beside the briefing report: one column per
// calendar (see calendar-board.config.ts — that's the tweakable bit). The
// pencilled column also hosts the briefing's own suggested_blocks, which is
// why the report hides its Suggested blocks section on this page. Columns
// fetch independently so one bad calendar never blanks the board.
//
// Deferrable columns (config.deferrable) let a timed event be dragged
// today↔tomorrow — a real defer/pull, PATCHed to Google via jimbo-api. The
// move is applied optimistically through a per-event day override and reverted
// if the write fails. All-day events and read-only columns aren't draggable.
//
// Freshness: fetches on load and again whenever the tab regains visibility —
// a tab left open overnight re-anchors "today" and re-dims past events on
// return. No interval polling; refocus covers the real "came back later" case.
@Component({
  selector: 'app-calendar-board',
  imports: [BriefingFeedback, CdkDropList, CdkDrag, BlockCard],
  templateUrl: './calendar-board.html',
  styleUrl: './calendar-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:visibilitychange)': 'onVisibilityChange()',
  },
})
export class CalendarBoard {
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly plannerSync = inject(PlannerSyncService);
  private readonly vaultItems = inject(VAULT_ITEMS_READ);
  private readonly projects = inject(ProjectsService);

  readonly briefingId = input.required<number>();
  readonly suggestedBlocks = input<SuggestedBlock[]>([]);

  // Each suggested_block paired with its resolved vault item (when it carries a
  // vault_seq that's loaded) — a vault-linked block renders as a first-class
  // block-card and pencils round-trippably; the rest fall back to prose.
  protected readonly resolvedBlocks = computed<ResolvedBlock[]>(() =>
    this.suggestedBlocks().map(blk => ({ blk, vault: this.resolveVaultBlock(blk) })));

  private readonly refreshedAt = signal(new Date());

  // Titles of suggested_blocks pencilled onto the Suggestions calendar this
  // session — flips the block's button to a settled state. Cleared on reload,
  // where the pencilled event itself then shows up in the Suggestions column.
  protected readonly pencilledTitles = signal<ReadonlySet<string>>(new Set());

  // Optimistic day placement while a defer PATCH is in flight (and until the
  // next reload brings ground truth). Keyed by event id → 'today' | 'tomorrow'.
  private readonly dayOverrides = signal<Record<string, 'today' | 'tomorrow'>>({});

  private readonly window = computed(() => {
    const now = this.refreshedAt();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return {
      now,
      todayKey: dateKey(now),
      tomorrowKey: dateKey(tomorrow),
      since: dayStart.toISOString(),
      until: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).toISOString(),
      todayLabel: now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
      tomorrowLabel: tomorrow.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
    };
  });

  protected readonly todayLabel = computed(() => this.window().todayLabel);
  protected readonly tomorrowLabel = computed(() => this.window().tomorrowLabel);

  // One resource per configured source; columns aggregate their own sources.
  // Requests read the window signal, so a day rollover refetches by itself;
  // same-day refocus goes through reload() below.
  private readonly sourceResources = CALENDAR_BOARD_COLUMNS.map((config) =>
    config.sources.map((src) =>
      httpResource<{ events: RawCalEvent[] }>(() => ({
        url: `${environment.dashboardApiUrl}/api/google-calendar/events`,
        params: {
          since: this.window().since,
          until: this.window().until,
          calendarId: src.calendarId,
          account: src.account,
        },
      })),
    ),
  );

  protected readonly columns = computed<BoardColumn[]>(() =>
    CALENDAR_BOARD_COLUMNS.map((config, i) => {
      const resources = this.sourceResources[i]!;
      const loading = resources.some((r) => r.isLoading());
      const failed = !loading && resources.every((r) => r.error() !== undefined);
      // Tag each event with the source it came from so a defer knows what to PATCH.
      const events = resources.flatMap((r, j) => {
        const src = config.sources[j]!;
        return (r.value()?.events ?? []).map((e) => toBoardEvent(e, this.window().now, src.calendarId, src.account));
      });
      return {
        config,
        loading,
        today: { events: this.dayEvents(events, this.window().todayKey, 'today'), failed },
        tomorrow: { events: this.dayEvents(events, this.window().tomorrowKey, 'tomorrow'), failed },
      };
    }),
  );

  protected onVisibilityChange(): void {
    if (this.document.hidden) return;
    this.reload();
  }

  private reload(): void {
    this.refreshedAt.set(new Date());
    this.dayOverrides.set({});
    this.pencilledTitles.set(new Set());
    for (const column of this.sourceResources) {
      for (const resource of column) resource.reload();
    }
  }

  private resolveVaultBlock(blk: SuggestedBlock): VaultBlockView | null {
    if (blk.vault_seq == null) return null;
    const item = this.vaultItems.getBySeq(blk.vault_seq);
    if (!item) return null;
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
      size: blk.size_blocks, // the briefing's suggested size wins over the item's estimate
      start: blk.start ?? null,
      timeText: blk.start ? hhmm(blk.start) : null,
    };
  }

  private colorForProject(projectId: string | null | undefined): string {
    if (!projectId) return 'var(--color-text-muted)';
    return this.projects.activeProjects().find(p => p.id === projectId)?.color_token || 'var(--color-accent)';
  }

  // Pencil a vault-linked block onto the Suggestions calendar round-trippably —
  // real deep-link + full extendedProperties via the planner's own sync path,
  // at the block's concrete start (or next hour if the skill gave none). The
  // planner then recognises and can shuffle/lock it.
  protected async pencilVaultBlock(v: VaultBlockView): Promise<void> {
    if (this.pencilledTitles().has(v.title)) return;
    this.pencilledTitles.update(s => new Set(s).add(v.title));
    const id = await this.plannerSync.create({
      id: v.id, seq: v.seq, title: v.title,
      projectName: v.projectName, projectColor: v.projectColor,
      priority: v.priority, owner: v.owner, epicLabel: v.epicLabel,
      size: v.size, locked: false, start: v.start ?? nextHourIso(),
    });
    if (id) {
      this.toast.success(`Pencilled “${v.title}” onto Suggestions`);
      this.reload();
    } else {
      this.pencilledTitles.update(s => { const n = new Set(s); n.delete(v.title); return n; });
      this.toast.error(`Couldn't pencil “${v.title}”`);
    }
  }

  // Pencil a suggested_block onto the Suggestions calendar at a rough starting
  // time (next full hour) — a first placement to refine in the planner, not a
  // committed slot. The block carries no vault item, so this uses the
  // suggestion-only sync path.
  protected async pencilBlock(blk: SuggestedBlock): Promise<void> {
    if (this.pencilledTitles().has(blk.title)) return;
    this.pencilledTitles.update((s) => new Set(s).add(blk.title));

    const id = await this.plannerSync.pencilBriefingBlock(
      { title: blk.title, size: blk.size_blocks }, blk.start ?? nextHourIso(),
    );
    if (id) {
      this.toast.success(`Pencilled “${blk.title}” onto Suggestions`);
      this.reload();
    } else {
      this.pencilledTitles.update((s) => {
        const next = new Set(s);
        next.delete(blk.title);
        return next;
      });
      this.toast.error(`Couldn't pencil “${blk.title}”`);
    }
  }

  // Drag today↔tomorrow within a deferrable column. Container ids are
  // `${col.key}-today` / `${col.key}-tomorrow`; a drop into the other list is a
  // one-day shift, same list is a no-op.
  protected async onDrop(event: CdkDragDrop<string>): Promise<void> {
    // CDK widens the drop-list data to string; narrow back to the two slots.
    const target: 'today' | 'tomorrow' = event.container.data === 'tomorrow' ? 'tomorrow' : 'today';
    if (target === event.previousContainer.data) return;
    const e = event.item.data as BoardEvent;
    if (!e.rawStart || !e.rawEnd) return; // all-day / malformed — not deferrable
    const dir = target === 'tomorrow' ? 1 : -1;

    // Optimistic: move it now, revert if the write fails.
    this.dayOverrides.update((m) => ({ ...m, [e.id]: target }));
    try {
      await firstValueFrom(
        this.http.patch(`${environment.dashboardApiUrl}/api/google-calendar/events/${encodeURIComponent(e.id)}`, {
          calendarId: e.calendarId,
          account: e.account,
          start: shiftIsoDays(e.rawStart, dir),
          end: shiftIsoDays(e.rawEnd, dir),
        }),
      );
      this.toast.success(`Moved “${e.title}” to ${target}`);
      this.reload();
    } catch {
      this.dayOverrides.update((m) => {
        const next = { ...m };
        delete next[e.id];
        return next;
      });
      this.toast.error(`Couldn't move “${e.title}”`);
    }
  }

  // One 🍅 per pomodoro, capped like the report's ▰-meter so an outlier
  // suggestion can't wrap the row.
  protected tomatoes(blocks: number): string {
    return '🍅'.repeat(Math.min(blocks, 8));
  }

  private dayEvents(raw: BoardEvent[], day: string, slot: 'today' | 'tomorrow'): BoardEvent[] {
    const overrides = this.dayOverrides();
    return raw
      .filter((e) => {
        const override = overrides[e.id];
        return override ? override === slot : onDay(e, day);
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }
}

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function nextHourIso(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d.toISOString();
}

function onDay(e: BoardEvent, day: string): boolean {
  if (e.allDay) {
    // All-day: the raw date is the start; single-day match is enough here.
    return e.rawStart !== null && e.rawStart.slice(0, 10) <= day && day < shiftIsoDays(e.rawStart, 1).slice(0, 10);
  }
  return e.rawStart !== null && dateKey(new Date(e.rawStart)) === day;
}

function toBoardEvent(e: RawCalEvent, now: Date, calendarId: string, account: string): BoardEvent {
  const title = e.summary ?? '(untitled)';
  const common = { id: e.id, title, calendarId, account };
  if (e.start.date) {
    // All-day pins above timed events via the sort key; rawStart is the date.
    return { ...common, time: null, allDay: true, past: false, sortKey: `0`, rawStart: e.start.date, rawEnd: e.end.date ?? null };
  }
  const start = new Date(e.start.dateTime!);
  const end = e.end.dateTime ? new Date(e.end.dateTime) : start;
  return {
    ...common,
    time: start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    allDay: false,
    past: end < now,
    sortKey: `1${e.start.dateTime}`,
    rawStart: e.start.dateTime!,
    rawEnd: e.end.dateTime ?? e.start.dateTime!,
  };
}
