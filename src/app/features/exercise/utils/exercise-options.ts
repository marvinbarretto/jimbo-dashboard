import { type QuickAddOption } from '@shared/components/ui-quick-add-row/ui-quick-add-row';
import { type ExerciseCatalogItem, type SessionDetailed } from '../data-access/exercise.service';
import { muscleSummary } from './muscle-region';

/**
 * Exercise picker options: full catalogue, with exercises you've actually done
 * (within the supplied sessions) boosted to the top and counted. Shared by the
 * desktop period page and the phone Train tab so both pickers rank and hint
 * identically.
 */
/**
 * Resolve a typed exercise name to a catalogue id — trim + case-insensitive
 * exact match. Shared so desktop and phone can't drift on what a typed name
 * resolves to; a miss means "create it".
 */
export function resolveExerciseByLabel(
  options: readonly QuickAddOption[],
  name: string,
): string | undefined {
  const n = name.trim().toLowerCase();
  return options.find((o) => o.label.trim().toLowerCase() === n)?.id;
}

export function buildExerciseOptions(
  sessions: readonly SessionDetailed[],
  catalog: readonly ExerciseCatalogItem[],
  index: ReadonlyMap<string, ExerciseCatalogItem>,
): QuickAddOption[] {
  const used = new Map<string, { name: string; count: number }>();
  for (const session of sessions) {
    for (const set of session.sets) {
      const cur = used.get(set.exercise_id);
      if (cur) cur.count++;
      else used.set(set.exercise_id, { name: set.exercise_name ?? set.exercise_id, count: 1 });
    }
  }

  const byId = new Map<string, { id: string; label: string; count: number }>();
  for (const e of catalog) {
    byId.set(e.id, { id: e.id, label: e.name, count: used.get(e.id)?.count ?? 0 });
  }
  // Sets can reference exercises missing from the (capped) catalogue fetch —
  // they still belong in the picker under their resolved name.
  for (const [id, { name, count }] of used) {
    const existing = byId.get(id);
    if (existing) existing.count = count;
    else byId.set(id, { id, label: name, count });
  }

  return [...byId.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((e) => {
      const muscles = muscleSummary(index.get(e.id));
      const usedHint = e.count > 0 ? `you · ${e.count}×` : null;
      return {
        id: e.id,
        label: e.label,
        boosted: e.count > 0,
        hint: [muscles, usedHint].filter(Boolean).join(' — ') || undefined,
      };
    });
}
