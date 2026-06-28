// Generic, measure-agnostic model for day-grouped entry logging. Nutrition is
// the first consumer (food = kcal/protein/carbs/fat, supplements = dose), but
// the same shapes drive project-work (minutes/commits), hydration, etc. The
// rule: a tracker is "a list of timestamped entries, each a label + a value per
// measure, grouped by day, summed per measure". Components render against the
// measure list; entries carry only the keys that apply to them, so a single
// group can interleave heterogeneous kinds (food + supplements) cleanly.

/** A numeric column tracked across entries (kcal, protein, minutes, …). */
export interface TrackerMeasure {
  readonly key: string;
  readonly label: string;
  readonly unit?: string;
  /** 'int' rounds + steps by 1; 'number' allows decimals. Default 'int'. */
  readonly kind?: 'int' | 'number';
  /** Editable inline + offered in quick-add. Default true. */
  readonly editable?: boolean;
  /** The headline measure (e.g. kcal) — rendered with emphasis. Default false. */
  readonly primary?: boolean;
  /**
   * Render this measure as a percentage of another measure's window total
   * rather than a raw sum — e.g. alcohol kcal as a share of total kcal. `of` is
   * the measure key to divide by. Shown as a stat card ("31%"); ignores targets.
   */
  readonly share?: { readonly of: string };
}

/** One timestamped entry: a label plus a value per measure key. */
export interface TrackerEntry {
  readonly id: string;
  readonly at: string; // ISO timestamp
  readonly label: string;
  readonly values: Readonly<Record<string, number | null>>;
  /** Sub-type for a badge / interleaved ledgers (e.g. 'food' | 'supplement'). */
  readonly kind?: string;
  /**
   * Per-entry unit overrides, keyed by measure key. Lets heterogeneous rows in
   * one group carry their own unit (a supplement's dose is 'g' or 'tablet')
   * without forcing it onto the group-level measure.
   */
  readonly units?: Readonly<Record<string, string>>;
  /** Still being estimated — render a pending hint, suppress values. */
  readonly pending?: boolean;
  /** When false the row stays read-only inside an editable group. Default true. */
  readonly editable?: boolean;
  /** When false the label is static even in edit mode (e.g. a catalog name). Default true. */
  readonly labelEditable?: boolean;
}

/** A new-entry draft from quick-add: no id yet; `at` defaults to the group day. */
export interface TrackerDraft {
  readonly label: string;
  readonly at?: string;
  readonly values: Record<string, number>;
  readonly kind?: string;
  /** Catalog id when the label came from a select (e.g. supplement_id). */
  readonly ref?: string;
}

/** A committed field-level edit on an existing entry. */
export interface TrackerPatch {
  readonly id: string;
  readonly changes: {
    readonly label?: string;
    readonly at?: string;
    readonly values?: Record<string, number | null>;
  };
}

/** Per-day rollup, for period totals and trends. */
export interface TrackerDailyTotal {
  readonly date: string; // YYYY-MM-DD
  readonly values: Readonly<Record<string, number>>;
  readonly count: number;
}

/** Sum each measure across entries that carry it (nulls ignored). */
export function sumMeasures(
  entries: readonly TrackerEntry[],
  measures: readonly TrackerMeasure[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of measures) out[m.key] = 0;
  for (const e of entries) {
    for (const m of measures) {
      const v = e.values[m.key];
      if (typeof v === 'number') out[m.key] += v;
    }
  }
  return out;
}

/** Measures an entry actually carries — lets one row shape render mixed kinds. */
export function measuresFor(
  entry: TrackerEntry,
  measures: readonly TrackerMeasure[],
): TrackerMeasure[] {
  return measures.filter((m) => m.key in entry.values);
}

export function roundForMeasure(m: TrackerMeasure, value: number): number {
  return (m.kind ?? 'int') === 'int' ? Math.round(value) : value;
}

// ── Time helpers ─────────────────────────────────────────────────
// datetime-local has no timezone; this app pins its wall-clock to Europe/London
// (BST/GMT, DST-correct) regardless of the browser's zone, so edited times match
// the London-bucketed data and read-only displays (formatLondonTime).

const LONDON_TZ = 'Europe/London';

/** ISO instant → `YYYY-MM-DDTHH:mm` (Europe/London wall-clock) for datetime-local. */
export function isoToLocalInput(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const v = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
  return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}`;
}

/** `YYYY-MM-DDTHH:mm` (Europe/London wall-clock) → ISO instant. Empty/invalid → null. */
export function localInputToIso(local: string): string | null {
  // datetime-local emits `YYYY-MM-DDTHH:mm`; reject anything else outright.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  // Treat the input as UTC to get a provisional instant, then correct by the
  // London offset *at that instant* (so BST vs GMT is handled per-date).
  const naive = Date.parse(`${local}:00Z`);
  if (Number.isNaN(naive)) return null;
  const londonWallOfNaive = isoToLocalInput(new Date(naive).toISOString());
  const offsetMs = naive - Date.parse(`${londonWallOfNaive}:00Z`);
  return new Date(naive + offsetMs).toISOString();
}
