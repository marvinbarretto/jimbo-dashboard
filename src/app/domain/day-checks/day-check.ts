// Day checks — the tick-off layer on the journal day page.
//
// A `def` is the question ("Started the day with the Start Sequence"); an
// `entry` is one day's answer. Days with no entry are genuinely unanswered —
// the API omits them rather than sending false, because a miss is a missing
// data point, not a "no".

export type DayCheckResponseType = 'bool' | 'scale' | 'text';
/** 'daily' = a standing check; 'once' = ad-hoc, drops off the list once answered. */
export type DayCheckCadence = 'daily' | 'once';
export type DayCheckSource = 'dashboard' | 'telegram' | 'mcp' | 'manual';

export interface DayCheckEntry {
  id: string;
  def_id: string;
  day: string;
  value_bool: boolean | null;
  value_int: number | null;
  value_text: string | null;
  source: DayCheckSource;
  noted_at: string;
}

export interface DayCheckDef {
  id: string;
  label: string;
  prompt: string | null;
  response_type: DayCheckResponseType;
  scale_min: number | null;
  scale_max: number | null;
  cadence: DayCheckCadence;
  active: boolean;
  sort_order: number;
  /** Pointer into the watchdog repo — 'EXP-0001', 'protocols/start-sequence-v1.0.0.md'. */
  watchdog_ref: string | null;
  notes: string | null;
  created_at: string;
  archived_at: string | null;
}

/** A definition joined to one day's answer. `entry` is null when untouched. */
export interface DayCheckItem extends DayCheckDef {
  entry: DayCheckEntry | null;
}

export interface DayChecksResponse {
  day: string;
  items: DayCheckItem[];
}

export interface DayCheckCreatePayload {
  label: string;
  prompt?: string | null;
  response_type?: DayCheckResponseType;
  scale_min?: number | null;
  scale_max?: number | null;
  cadence?: DayCheckCadence;
  sort_order?: number;
  watchdog_ref?: string | null;
  notes?: string | null;
}

export interface DayCheckEntryPayload {
  date?: string;
  value_bool?: boolean | null;
  value_int?: number | null;
  value_text?: string | null;
  source?: DayCheckSource;
}
