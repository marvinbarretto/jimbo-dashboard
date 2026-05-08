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

import type { WritableSignal } from '@angular/core';
import type { Observable } from 'rxjs';

// We only need `error()`. Typed as a structural slice so tests can pass a
// stub with a single method without dragging in the full ToastService.
interface ToastErrorSink {
  error(message: string): void;
}

export interface OptimisticUpdate<T extends { id: unknown }> {
  /** Snapshot of the row before the change — used for rollback. */
  prior: T;
  /** Optimistic value to splice into the store immediately. */
  next: T;
  /** Async work that confirms (or rejects) the change. */
  request: Observable<unknown>;
  /** Toast text shown when the request fails and we roll back. */
  errorMessage: string;
  /** Hook fired once the request resolves. Use to apply server-assigned fields. */
  onSuccess?(response: unknown): void;
}

/**
 * Update an existing entity by id. Splices `next` in immediately; on request
 * failure, restores `prior` and toasts `errorMessage`. The store update uses
 * id-based replacement so concurrent edits to OTHER rows aren't clobbered.
 */
export function withOptimisticUpdate<T extends { id: unknown }>(
  store: WritableSignal<T[]>,
  toast: ToastErrorSink,
  ctx: OptimisticUpdate<T>,
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

export interface OptimisticCreate<T extends { id: unknown }> {
  /** Row carrying a client-generated temp id; replaced with real row on success. */
  optimistic: T;
  request: Observable<unknown>;
  /** Build the canonical row from the request response (real id, server timestamps, etc). */
  realFromResponse(response: unknown): T;
  errorMessage: string;
  onSuccess?(real: T): void;
}

/**
 * Create with temp-id replacement. Prepends `optimistic` (with its temp id)
 * immediately; on success, replaces it with `realFromResponse(response)`.
 * On failure, removes the temp row and toasts. Order matters — prepend so
 * fresh items appear at the top of lists; tests assert that.
 */
export function withOptimisticCreate<T extends { id: unknown }>(
  store: WritableSignal<T[]>,
  toast: ToastErrorSink,
  ctx: OptimisticCreate<T>,
): void {
  const tempId = ctx.optimistic.id;
  store.update(items => [ctx.optimistic, ...items]);
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

export interface OptimisticRemove<T extends { id: unknown }> {
  prior: T;
  request: Observable<unknown>;
  errorMessage: string;
  onSuccess?(): void;
}

/**
 * Hard-remove. Filters out the row immediately; restores on request failure.
 * Restored row is appended (not re-inserted at original position) — for the
 * use cases this serves (list views with sort/filter), order is derived in a
 * computed downstream so the position change isn't observable.
 */
export function withOptimisticRemove<T extends { id: unknown }>(
  store: WritableSignal<T[]>,
  toast: ToastErrorSink,
  ctx: OptimisticRemove<T>,
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
