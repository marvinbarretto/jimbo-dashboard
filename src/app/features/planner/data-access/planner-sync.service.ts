// Syncs planner placements to the real "Jimbo Suggestions" Google Calendar
// via jimbo-api's event write routes. extendedProperties.private carries the
// vault item's id/seq/project/priority/owner/epic/size/locked state so a
// synced event round-trips losslessly and can be told apart from a genuine
// Jimbo-authored suggestion on reload (see reconcileAll/isOurs).
//
// Writes are best-effort: a failed call is logged and swallowed rather than
// thrown — the planner's own signals stay the source of truth for what's on
// screen, sync is a side effect layered on top, not a dependency of it.
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Priority } from '@domain/vault/vault-item';
import type { ActorId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import type { SuggestionEvent } from './jimbo-suggestions.service';

export interface SyncableBlock {
  readonly id: string; // vault item id
  readonly seq: number;
  readonly title: string;
  readonly projectName: string;
  readonly projectColor: string;
  readonly priority: Priority;
  readonly owner: ActorId | null;
  readonly epicLabel: string | null;
  readonly size: number; // in 25-minute pomodoro blocks
  readonly locked: boolean;
  readonly start: string; // ISO
}

// A block reconstructed from a previously-synced calendar event's
// extendedProperties — same shape as SyncableBlock plus the real event id
// it lives at, so a subsequent move/resize/lock knows what to PATCH.
export interface ReconciledBlock extends SyncableBlock {
  readonly googleEventId: string;
}

// A block is 25 minutes of work in a 30-minute slot (the last 5 are the
// break). The real calendar event books the whole slot, matching what the
// planner grid renders — see the SLOT_MINUTES note in planner-page.ts.
const SLOT_MINUTES = 30;

// Same calendar JimboSuggestionsService reads. Marvin has reader access only
// (shared calendar) — the owning account, and the only one that can write to
// it, is `jimbo` (matches the priority-scheduler cron's own writes).
const JIMBO_SUGGESTIONS_CALENDAR_ID =
  '2244d4f6d61cbc9f2041405c16dea6726a34f2c895e49dce7c5e1e4f0287789c@group.calendar.google.com';
const WRITE_ACCOUNT = 'jimbo';

// Same host serves the dashboard SPA at domain root and jimbo-api under
// /api/* (Caddy routes by path, not subdomain) — so this is also the
// dashboard's own base URL, not just the API's.
const DASHBOARD_BASE_URL = 'https://jimbo.fourfoldmedia.uk';

// Marks an event as one the planner itself created, vs a genuine
// Jimbo-authored proposal — the only signal reconciliation has to tell the
// two apart on reload.
const SOURCE_MARKER = 'jimbo-planner';

interface CreateEventResponse {
  readonly id: string;
}

@Injectable({ providedIn: 'root' })
export class PlannerSyncService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  async create(block: SyncableBlock): Promise<string | null> {
    try {
      const res = await firstValueFrom(
        this.http.post<CreateEventResponse>(`${this.base}/api/google-calendar/events`, {
          calendarId: JIMBO_SUGGESTIONS_CALENDAR_ID,
          account: WRITE_ACCOUNT,
          summary: block.title,
          description: deepLink(block),
          start: block.start,
          end: endOf(block),
          extendedProperties: { private: toPrivateProps(block) },
        }),
      );
      return res.id;
    } catch (e) {
      console.error('PlannerSyncService.create failed', e);
      return null;
    }
  }

  async update(googleEventId: string, block: SyncableBlock): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch(`${this.base}/api/google-calendar/events/${encodeURIComponent(googleEventId)}`, {
          calendarId: JIMBO_SUGGESTIONS_CALENDAR_ID,
          account: WRITE_ACCOUNT,
          summary: block.title,
          description: deepLink(block),
          start: block.start,
          end: endOf(block),
          extendedProperties: { private: toPrivateProps(block) },
        }),
      );
    } catch (e) {
      console.error('PlannerSyncService.update failed', e);
    }
  }

  async remove(googleEventId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.base}/api/google-calendar/events/${encodeURIComponent(googleEventId)}`, {
          params: { calendarId: JIMBO_SUGGESTIONS_CALENDAR_ID, account: WRITE_ACCOUNT },
        }),
      );
    } catch (e) {
      console.error('PlannerSyncService.remove failed', e);
    }
  }

  /** True when this suggestion event is actually a planner-synced placement. */
  isOurs(ev: SuggestionEvent): boolean {
    return ev.privateProps?.['source'] === SOURCE_MARKER;
  }

  /** Reconstructs every synced placement out of a batch of raw suggestion events. Malformed entries are skipped. */
  reconcileAll(events: readonly SuggestionEvent[]): ReconciledBlock[] {
    const out: ReconciledBlock[] = [];
    for (const ev of events) {
      if (!this.isOurs(ev)) continue;
      const block = fromPrivateProps(ev);
      if (block) out.push(block);
    }
    return out;
  }
}

function deepLink(block: SyncableBlock): string {
  return `${DASHBOARD_BASE_URL}/vault-items/${block.seq}`;
}

function endOf(block: SyncableBlock): string {
  const start = new Date(block.start);
  return new Date(start.getTime() + block.size * SLOT_MINUTES * 60_000).toISOString();
}

function toPrivateProps(block: SyncableBlock): Record<string, string> {
  return {
    source: SOURCE_MARKER,
    vaultItemId: block.id,
    seq: String(block.seq),
    projectName: block.projectName,
    projectColor: block.projectColor,
    priority: String(block.priority),
    owner: block.owner ?? '',
    epicLabel: block.epicLabel ?? '',
    size: String(block.size),
    locked: String(block.locked),
  };
}

function fromPrivateProps(ev: SuggestionEvent): ReconciledBlock | null {
  const props = ev.privateProps;
  if (!props) return null;
  const seq = Number(props['seq']);
  const size = Number(props['size']);
  const priority = Number(props['priority']);
  if (!props['vaultItemId'] || !Number.isFinite(seq) || !Number.isFinite(size)) return null;
  return {
    googleEventId: ev.id,
    id: props['vaultItemId'],
    seq,
    title: ev.title,
    projectName: props['projectName'] || 'No project',
    projectColor: props['projectColor'] || 'var(--color-accent)',
    priority: (Number.isFinite(priority) ? priority : 3) as Priority,
    owner: (props['owner'] || null) as ActorId | null,
    epicLabel: props['epicLabel'] || null,
    size,
    locked: props['locked'] === 'true',
    start: ev.start,
  };
}
