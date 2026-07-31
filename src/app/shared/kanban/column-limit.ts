import { signal, type Signal } from '@angular/core';

// Per-column render cap for kanban boards.
//
// A board reads from the whole active vault — several hundred cards, ~400 of
// them sitting in one grooming column. Rendering every one costs a full
// VaultCard each and buries the work that actually needs attention under a
// column nobody scrolls to the bottom of.
//
// The cap slices each column AFTER the board's sort, so "25" means "the top 25
// by the current sort", never an arbitrary 25. It caps per COLUMN rather than
// per board: a single board-wide budget would let the ungroomed backlog starve
// every other column.
//
// The cap never hides volume — the column keeps reporting its true total, so a
// capped board still tells the truth about the size of the backlog.

/** Caps offered in the filter bar. `null` = no cap, render everything. */
export const COLUMN_LIMIT_OPTIONS: readonly (number | null)[] = [10, 25, 50, null];

export const DEFAULT_COLUMN_LIMIT = 25;

/** URL token for "no cap" — `?limit=all` reads better than an empty param. */
const ALL = 'all';

export interface KanbanColumnLimit {
  /** Cards rendered per column before expansion. `null` = uncapped. */
  limit: Signal<number | null>;

  /** Change the cap. Collapses every local expansion — the new cap is the floor. */
  setLimit(next: number | null): void;

  /**
   * Slice one column's cards to the active cap plus whatever that column has
   * been locally expanded by. Pass the FULL sorted list; keep its length for
   * the column's `total`.
   */
  take<T>(columnId: string, cards: readonly T[]): readonly T[];

  /** Grow one column by one more cap's worth of cards. */
  showMore(columnId: string): void;

  /** Collapse every column back to the cap. Call when the visible set changes. */
  collapseAll(): void;
}

export function createKanbanColumnLimit(
  initial: number | null = DEFAULT_COLUMN_LIMIT,
): KanbanColumnLimit {
  const _limit = signal<number | null>(initial);
  // Per-column extra rows granted by "show more". Keyed by column id; absent =
  // never expanded. Replaced wholesale so the signal notices the change.
  const _extra = signal<ReadonlyMap<string, number>>(new Map());

  return {
    limit: _limit.asReadonly(),

    setLimit(next) {
      _limit.set(next);
      _extra.set(new Map());
    },

    take<T>(columnId: string, cards: readonly T[]): readonly T[] {
      const base = _limit();
      if (base === null) return cards;
      const cap = base + (_extra().get(columnId) ?? 0);
      return cards.length <= cap ? cards : cards.slice(0, cap);
    },

    showMore(columnId) {
      const base = _limit();
      if (base === null) return;
      _extra.update(map => {
        const next = new Map(map);
        next.set(columnId, (next.get(columnId) ?? 0) + base);
        return next;
      });
    },

    collapseAll() {
      _extra.set(new Map());
    },
  };
}

/**
 * Read a cap off a URL query param.
 *
 * @param raw the raw `limit` param value, or null when absent
 * @returns the cap (`null` for uncapped), or `undefined` when the param is
 *   absent or unparseable — callers keep their default in that case
 */
export function parseColumnLimit(raw: string | null): number | null | undefined {
  if (raw === null || raw === '') return undefined;
  if (raw === ALL) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/**
 * Render a cap for the URL.
 *
 * @param limit the active cap, `null` for uncapped
 * @returns the param value, or `null` to omit the param entirely (the default
 *   cap stays out of the URL so a plain board link is the plain board)
 */
export function serializeColumnLimit(limit: number | null): string | null {
  if (limit === DEFAULT_COLUMN_LIMIT) return null;
  return limit === null ? ALL : String(limit);
}

/**
 * Label for a cap chip.
 *
 * @param limit the cap, `null` for uncapped
 * @returns display text for the filter-bar chip
 */
export function columnLimitLabel(limit: number | null): string {
  return limit === null ? 'All' : String(limit);
}
