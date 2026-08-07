// The evening reflection record — mirrors jimbo-api's reflection service.
//
// The distinction the types have to keep is between what Marvin wrote and what
// the fleet prepared. `ReflectionSession` and `GratitudeItem` are his; a
// `GratitudeCandidate` is only an offer, and stays an offer until he accepts it
// and it becomes a `GratitudeItem`. The page must never render the two as the
// same thing.

export type ReflectionSource = 'dashboard' | 'mcp' | 'manual';
export type GratitudeOrigin = 'human' | 'seeded';

export interface ReflectionSession {
  /** Logical day (04:00 cutover) — a 01:30 session belongs to the evening that is ending. */
  day: string;
  opened_at: string;
  /** Null while the evening is still open. An abandoned session is real data, not an error. */
  completed_at: string | null;
  highs: string | null;
  lows: string | null;
  /** His answer to the drift question. Unused until goals exist. */
  drift_note: string | null;
  tomorrow_shape: string | null;
  source: ReflectionSource;
  updated_at: string;
}

export interface GratitudeItem {
  id: number;
  day: string;
  content: string;
  origin: GratitudeOrigin;
  /** Which prep candidate it came from, and the telemetry behind it ('code_session:abc'). */
  seed_ref: string | null;
  /** He changed the machine's words on the way through. */
  edited: boolean;
  created_at: string;
}

/** Something the fleet noticed and is offering. Not part of the record until accepted. */
export interface GratitudeCandidate {
  ref: string;
  content: string;
  accepted: boolean;
}

export interface UnaccountedSpan {
  from: string;
  to: string;
}

export interface TimelineMoment {
  at: string;
  label: string;
}

/**
 * What the evening-prep job left. Every field optional: prep is written by a
 * job that will churn weekly, and a page that hard-requires a key it stopped
 * emitting is a page that breaks on a night he is trying to use it.
 */
export interface PrepPayload {
  summary?: string;
  timeline?: TimelineMoment[];
  unaccounted?: UnaccountedSpan[];
  drift_question?: string;
}

export interface ReflectionPrep {
  day: string;
  generated_at: string;
  /** The job that produced it, so a bad night's prep is traceable on the fleet page. */
  generator: string;
  payload: PrepPayload;
}

export type CommitmentKind = 'do' | 'avoid' | 'decide';
export type CommitmentStatus = 'open' | 'kept' | 'missed' | 'dropped' | 'carried';
export type CommitmentResolution = 'kept' | 'missed' | 'dropped';

export interface Commitment {
  id: string;
  made_on: string;
  for_day: string;
  content: string;
  kind: CommitmentKind;
  goal_id: string | null;
  delegable: boolean;
  dispatch_id: string | null;
  status: CommitmentStatus;
  resolved_at: string | null;
  resolution_note: string | null;
  carried_from: string | null;
  created_at: string;
  /** Length of the carry chain behind this one — the third deferral is the interesting fact. */
  carry_count: number;
}

export interface ReflectionDay {
  day: string;
  session: ReflectionSession | null;
  gratitude: GratitudeItem[];
  candidates: GratitudeCandidate[];
  prep: ReflectionPrep | null;
  /** Made this evening, for tomorrow or later. */
  made_tonight: Commitment[];
  /** What he said he would do today, back when he made it. The readback. */
  due_today: Commitment[];
  /** Still open from before today. Never hidden. */
  overdue: Commitment[];
}

export interface SessionPatch {
  highs?: string | null;
  lows?: string | null;
  drift_note?: string | null;
  tomorrow_shape?: string | null;
}

export interface CommitmentCreatePayload {
  content: string;
  for_day?: string;
  kind?: CommitmentKind;
  delegable?: boolean;
}
