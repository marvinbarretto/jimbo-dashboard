import { type FrequentFood } from './nutrition.service';

/**
 * "Usuals" — frequent foods surfaced as one-tap log chips, shared by the phone
 * shell's Log tab and the desktop nutrition day view.
 *
 * Pure on purpose (like nutrition-ledger): both surfaces read the same
 * frequents endpoint, so how a chip row is derived from it must not drift.
 */

/** A frequent food surfaced as a one-tap log button. */
export interface Usual {
  /** Quantity-stripped, lowercased label — dedupe key and display text. */
  readonly key: string;
  readonly kcal: number;
  readonly item: FrequentFood;
}

// "1 pale ale" / "3 pale ale" / "1 Guinness" collapse onto one chip each: the
// frequents endpoint ranks raw labels, and leading quantities fragment them.
export function usualKey(label: string): string {
  return label.replace(/^\d+\s+/, '').trim().toLowerCase();
}

export interface BuildUsualsOptions {
  /** Chips shown. Default 6 — a single wrap-free row on a phone. */
  max?: number;
  /**
   * Slots reserved for the most recently logged foods that frequency alone
   * wouldn't surface. Without this, a food logged three times yesterday can't
   * beat a two-year count and new habits never reach the chip row. Default 2.
   */
  recentSlots?: number;
}

/**
 * Frequency-ranked chips with a recency blend: the top of the server's
 * count-ordered list, minus `recentSlots` slots which go to the most recently
 * logged keys not already present. Macro-less entries are dropped (a chip tap
 * copies macros verbatim — nothing to copy), labels dedupe via usualKey.
 */
export function buildUsuals(items: readonly FrequentFood[], opts: BuildUsualsOptions = {}): Usual[] {
  const max = opts.max ?? 6;
  const recentSlots = opts.recentSlots ?? 2;

  // Dedupe by key, preserving the server's count-descending order.
  const seen = new Set<string>();
  const candidates: Usual[] = [];
  for (const f of items) {
    if (f.est_kcal === null) continue;
    const key = usualKey(f.label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    candidates.push({ key, kcal: Math.round(f.est_kcal), item: f });
  }
  if (candidates.length <= max) return candidates;

  const byFrequency = candidates.slice(0, Math.max(0, max - recentSlots));
  const chosen = new Set(byFrequency.map((u) => u.key));

  // `?? ''` covers rows from an API deployed before last_logged_at existed.
  const recents = [...candidates].sort((a, b) =>
    (b.item.last_logged_at ?? '').localeCompare(a.item.last_logged_at ?? ''),
  );
  const out = [...byFrequency];
  for (const u of recents) {
    if (out.length >= max) break;
    if (chosen.has(u.key)) continue;
    chosen.add(u.key);
    out.push(u);
  }
  return out;
}

/** Times each usual was logged in a set of entries — the ×n tally on its chip. */
export function tallyUsuals(labels: readonly string[]): ReadonlyMap<string, number> {
  const m = new Map<string, number>();
  for (const label of labels) {
    const key = usualKey(label);
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return m;
}
