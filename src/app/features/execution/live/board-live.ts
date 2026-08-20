import { DestroyRef, effect, inject, signal } from '@angular/core';
import { StreamService, type SystemEventSummary } from '@features/stream/stream.service';
import { DispatchService } from '@features/execution/data-access/dispatch.service';
import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';
import { AwaitingService } from '@features/awaiting/data-access/awaiting.service';
import { CURRENT_ACTOR_ID } from '@domain/actors';
import { dispatchId, vaultItemId } from '@domain/ids';

/**
 * Kinds this board reacts to. An explicit allow-list, not a `startsWith`: the
 * stream carries ~2,700 events per 48h, the overwhelming majority of which
 * (tool.pre, tool.post, heartbeat, email.*) say nothing about a card, and
 * refetching on them would make the board more expensive live than static.
 */
const CARD_KINDS = new Set([
  'dispatch.stage_changed',
  'note.reassigned',
  'question.raised',
  'question.answered',
]);

/**
 * Kinds that change WHO is waiting on whom, and therefore the strip.
 * Deliberately excludes dispatch stage changes: a commission moving through its
 * stages doesn't hand anything to the operator.
 */
const STRIP_KINDS = new Set(['note.reassigned', 'question.raised', 'question.answered']);

/** Debounce for the strip refetch — a batch handback fires a burst of events. */
const STRIP_REFRESH_MS = 1_500;

/**
 * `dispatch.stage_changed` carries its dispatch id in `correlation_id`, because
 * the stream summary has no payload — the same field that threads a dispatch's
 * whole lifecycle into one row on the stream page.
 */
function dispatchIdFrom(event: SystemEventSummary): string | null {
  const cid = event.correlation_id;
  if (!cid?.startsWith('dispatch:')) return null;
  const raw = cid.slice('dispatch:'.length);
  return /^\d+$/.test(raw) ? raw : null;
}

export interface BoardRefreshPlan {
  /** Dispatch ids to re-read — deduped, so approved→running is one fetch. */
  dispatches: string[];
  /** Vault note ids to re-read. */
  notes: string[];
  /** Whether anything changed who is waiting on whom. */
  stripDirty: boolean;
}

/**
 * What to refresh for a batch of newly-arrived events. Pure, so the routing
 * rules can be tested without a stream, a socket, or an injector — the part
 * that goes wrong here is "which events count", not the plumbing.
 *
 * `watermark` is exclusive: events at or below it have already been handled.
 */
export function planRefresh(
  events: readonly SystemEventSummary[],
  watermark: number,
): BoardRefreshPlan {
  const dispatches = new Set<string>();
  const notes = new Set<string>();
  let stripDirty = false;

  for (const event of events) {
    if (event.id <= watermark) continue;
    if (!CARD_KINDS.has(event.kind)) continue;

    if (event.ref_type === 'vault_note' && event.ref_id) notes.add(event.ref_id);
    const did = dispatchIdFrom(event);
    if (did) dispatches.add(did);
    if (STRIP_KINDS.has(event.kind)) stripDirty = true;
  }

  return { dispatches: [...dispatches], notes: [...notes], stripDirty };
}

/**
 * Subscribe the execution board to the live event stream, refreshing the ONE
 * item each event names rather than refetching the board.
 *
 * Call from a component's injection context. Returns the connection status so
 * the UI can say when it has gone stale — a card that silently stops updating
 * because the stream dropped is worse than no stream at all.
 */
export function withLiveBoardUpdates() {
  const stream = inject(StreamService);
  const dispatch = inject(DispatchService);
  const vaultItems = inject(VaultItemsService);
  const awaiting = inject(AwaitingService);
  const destroyRef = inject(DestroyRef);

  stream.connect();

  // The stream hydrates with its last 200 events on connect. Those describe the
  // past, and the board has just loaded that state from the API anyway —
  // reacting to them would fire ~200 single-item refetches for nothing. So the
  // first emission only establishes the watermark.
  const lastSeenId = signal<number | null>(null);
  let stripTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleStripRefresh = (): void => {
    if (stripTimer) return;
    stripTimer = setTimeout(() => {
      stripTimer = null;
      awaiting.load(CURRENT_ACTOR_ID);
    }, STRIP_REFRESH_MS);
  };

  effect(() => {
    const events = stream.events();
    if (events.length === 0) return;

    const highest = events[events.length - 1].id;
    const watermark = lastSeenId();
    lastSeenId.set(highest);
    if (watermark === null) return; // hydrate pass — establish, don't react

    const plan = planRefresh(events, watermark);
    for (const id of plan.dispatches) dispatch.refreshOne(dispatchId(id));
    for (const id of plan.notes) vaultItems.refreshOne(vaultItemId(id));
    if (plan.stripDirty) scheduleStripRefresh();
  });

  destroyRef.onDestroy(() => {
    if (stripTimer) clearTimeout(stripTimer);
    // NOT stream.disconnect(): StreamService is app-scoped and the stream page
    // may be using the same connection. Leaving it open costs one idle SSE
    // socket and avoids tearing down somebody else's feed.
  });

  return { status: stream.status, lastError: stream.lastError };
}
