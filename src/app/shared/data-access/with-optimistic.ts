// Optimistic-update primitives for signal-based entity stores.
//
// Replaces ~30 hand-rolled copies of "snapshot prior → set optimistic →
// HTTP → revert on error → toast" scattered across the data-access services.
// The store and toast are passed in (no DI inside) so these are trivially
// testable and reusable across any signal store that holds T[] keyed by id.
//
// Three shapes — keep them small and focused. Don't add success-path
// reconciliation here; pass an `onSuccess` callback and let the caller
// patch in server-assigned fields. The helpers own only the rollback policy.
//
// ── Caller contract (applies to all three helpers) ───────────────────────
//
// * `request` MUST complete. The helpers subscribe directly without
//   take(1)/first() — passing a long-lived observable (BehaviorSubject, hot
//   stream) leaks the subscription and may double-fire rollback. HttpClient
//   completes after a single response, which is the intended shape; if a
//   caller ever needs a non-completing source, wrap it with `take(1)` first.
//
// * Concurrent updates to the SAME row are not serialised. If update #1
//   fires, then update #2 fires before #1 errors, #1's rollback restores
//   `prior` captured at #1's call — silently undoing #2's change. This is
//   identical to the hand-rolled pattern these helpers replaced; for a
//   single-operator dashboard the risk is theoretical, but if a use case
//   ever needs row-level serialisation it must be added at the caller (e.g.
//   queue updates per id) — the helpers are intentionally stateless.

import type { WritableSignal } from '@angular/core';
import type { Observable } from 'rxjs';

// We only need `error()`. Typed as a structural slice so tests can pass a
// stub with a single method without dragging in the full ToastService.
interface ToastErrorSink {
  error(message: string): void;
}

export interface OptimisticUpdate<T extends { id: unknown }, R = unknown> {
  /** Snapshot of the row before the change — used for rollback. */
  prior: T;
  /** Optimistic value to splice into the store immediately. */
  next: T;
  /** Async work that confirms (or rejects) the change. MUST complete. */
  request: Observable<R>;
  /** Toast text shown when the request fails and we roll back. */
  errorMessage: string;
  /**
   * Hook fired once the request resolves. Use to apply server-assigned
   * fields, emit audit events, fire success toasts, etc. The response is
   * typed via the `R` generic — TS infers it from the `request` observable's
   * value type, so callers usually don't need to spell it explicitly.
   */
  onSuccess?(response: R): void;
}

/**
 * Update an existing entity by id. Splices `next` in immediately; on request
 * failure, restores `prior` and toasts `errorMessage`. The store update uses
 * id-based replacement so concurrent edits to OTHER rows aren't clobbered.
 *
 * @typeParam T - row shape (must have `id`)
 * @typeParam R - response type from `request`; defaults to `unknown` so
 *                untyped callers still compile, inferred when caller passes
 *                a typed observable like `http.patch<Foo>(...)`
 */
export function withOptimisticUpdate<T extends { id: unknown }, R = unknown>(
  store: WritableSignal<T[]>,
  toast: ToastErrorSink,
  ctx: OptimisticUpdate<T, R>,
): void {
  const id = ctx.prior.id;
  store.update(items => items.map(i => i.id === id ? ctx.next : i));
  ctx.request.subscribe({
    next: r => ctx.onSuccess?.(r),
    error: () => {
      store.update(items => items.map(i => i.id === id ? ctx.prior : i));
      toast.error(ctx.errorMessage);
    },
  });
}

export interface OptimisticCreate<T extends { id: unknown }, R = unknown> {
  /** Row carrying a client-generated temp id; replaced with real row on success. */
  optimistic: T;
  /** Async work that confirms (or rejects) the create. MUST complete. */
  request: Observable<R>;
  /**
   * Build the canonical row from the request response (real id, server
   * timestamps, etc). Receives the typed response payload directly — no cast
   * needed when `request` is typed.
   */
  realFromResponse(response: R): T;
  errorMessage: string;
  onSuccess?(real: T): void;
  /**
   * Where to splice the optimistic row into the store.
   *
   * Default 'prepend' — newest-first lists (kanban columns, board capture
   * inputs) want fresh items at the top. Use 'append' for views where the
   * insertion order matters semantically (e.g. legacy `create()` callers
   * whose downstream sort/filter assumes items arrive at the end).
   */
  position?: 'prepend' | 'append';
}

/**
 * Create with temp-id replacement. Splices `optimistic` (with its temp id)
 * into the store immediately; on success, replaces it with
 * `realFromResponse(response)`. On failure, removes the temp row and toasts.
 *
 * The replacement on success uses id-based mapping rather than positional
 * splice so the row stays where it was originally inserted, regardless of
 * any concurrent edits to other rows in between.
 */
export function withOptimisticCreate<T extends { id: unknown }, R = unknown>(
  store: WritableSignal<T[]>,
  toast: ToastErrorSink,
  ctx: OptimisticCreate<T, R>,
): void {
  const tempId = ctx.optimistic.id;
  const append = ctx.position === 'append';
  store.update(items => append
    ? [...items, ctx.optimistic]
    : [ctx.optimistic, ...items]);
  ctx.request.subscribe({
    next: response => {
      const real = ctx.realFromResponse(response);
      store.update(items => items.map(i => i.id === tempId ? real : i));
      ctx.onSuccess?.(real);
    },
    error: () => {
      store.update(items => items.filter(i => i.id !== tempId));
      toast.error(ctx.errorMessage);
    },
  });
}

export interface OptimisticRemove<T extends { id: unknown }, R = unknown> {
  prior: T;
  /** Async work that confirms (or rejects) the delete. MUST complete. */
  request: Observable<R>;
  errorMessage: string;
  onSuccess?(): void;
}

/**
 * Hard-remove. Filters out the row immediately; restores on request failure.
 * Restored row is appended (not re-inserted at original position) — for the
 * use cases this serves (list views with sort/filter), order is derived in a
 * computed downstream so the position change isn't observable.
 */
export function withOptimisticRemove<T extends { id: unknown }, R = unknown>(
  store: WritableSignal<T[]>,
  toast: ToastErrorSink,
  ctx: OptimisticRemove<T, R>,
): void {
  const id = ctx.prior.id;
  store.update(items => items.filter(i => i.id !== id));
  ctx.request.subscribe({
    next: () => ctx.onSuccess?.(),
    error: () => {
      store.update(items => [...items, ctx.prior]);
      toast.error(ctx.errorMessage);
    },
  });
}
