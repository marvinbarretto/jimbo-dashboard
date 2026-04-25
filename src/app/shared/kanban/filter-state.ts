import { computed, signal, type Signal, type WritableSignal } from '@angular/core';

// Filter-state composable for kanban boards. Manages a Set<value> per named
// dimension (project / owner / priority for grooming; skill / executor / status
// for execution; whatever the next board needs).
//
// The composable owns the signals + toggle/reset helpers. The BOARD owns the
// per-dimension predicates because those depend on the entity shape — see
// `applyFilters` example in the consuming board.
//
// Empty Set = no filter applied for that dimension. Same convention as before.

export interface KanbanFilterState {
  /**
   * Read the active set for a given dimension. Returns a typed Signal so the
   * caller can use it in computeds / templates.
   */
  active<V = string | number>(dimensionId: string): Signal<Set<V>>;

  /** Add or remove a value from a dimension's active set. No-op for unknown ids. */
  toggle(dimensionId: string, value: unknown): void;

  /** Clear every dimension's active set. */
  reset(): void;

  /** True if any dimension has at least one value selected. */
  hasActive: Signal<boolean>;
}

export function createKanbanFilterState(dimensionIds: readonly string[]): KanbanFilterState {
  const sigs = new Map<string, WritableSignal<Set<unknown>>>();
  for (const id of dimensionIds) sigs.set(id, signal(new Set()));

  return {
    active<V>(dimensionId: string): Signal<Set<V>> {
      const sig = sigs.get(dimensionId);
      if (!sig) {
        throw new Error(`createKanbanFilterState: unknown dimension '${dimensionId}'`);
      }
      return sig.asReadonly() as Signal<Set<V>>;
    },

    toggle(dimensionId, value) {
      const sig = sigs.get(dimensionId);
      if (!sig) return;
      sig.update(set => {
        const next = new Set(set);
        next.has(value) ? next.delete(value) : next.add(value);
        return next;
      });
    },

    reset() {
      for (const sig of sigs.values()) sig.set(new Set());
    },

    hasActive: computed(() =>
      Array.from(sigs.values()).some(s => s().size > 0),
    ),
  };
}
