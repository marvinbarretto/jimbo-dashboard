// The published daily report — mirrors jimbo-api's day-reports service.
//
// Nothing here was written by a human, which is the whole difference from
// [ReflectionSession]: there is no authored text to protect, so the writer owns
// every field and republishing a day is always safe.
//
// Every payload field is optional on purpose. The writer will add and retire
// sections as they earn their place, and a page that hard-requires a key the
// job stopped emitting is a page that breaks on the morning it is being read.

export type ReportFrictionLevel = 'low' | 'medium' | 'high';

/** A commit as the report cites it — enough to recognise, not to replay. */
export interface ReportCommit {
  sha: string;
  repo: string;
  at: string;
  subject: string;
}

/**
 * One thread of work through the day. Arcs are how the report stays readable:
 * a day is 15 sessions and 30 commits, but two or three arcs.
 */
export interface ReportArc {
  title: string;
  from: string;
  to: string;
  /**
   * Attributed by the writer from narrative text and commits, NOT from
   * `code_sessions.project_id` — the cwd prefix map mislabels routinely, so an
   * arc's project is a claim the writer makes, not a column it copied.
   */
  project_id: string | null;
  summary: string;
  commits?: ReportCommit[];
  friction?: ReportFrictionLevel;
}

export interface ReportFleetJob {
  job_name: string;
  runs: number;
  model?: string | null;
  /** Null for flat-billed runs — not zero cost, just not billed through OpenRouter. */
  cost_usd?: number | null;
  notable?: string;
}

export interface ReportDispatchPulse {
  completed: number;
  failed: number;
  waiting_on_marvin: number;
  running: number;
}

export interface ReportMcpTool {
  tool: string;
  count: number;
  error_count: number;
}

export interface ReportFleetFailure {
  job_name: string;
  at: string;
  detail: string;
}

export interface ReportFleet {
  jobs?: ReportFleetJob[];
  dispatch?: ReportDispatchPulse;
  mcp?: ReportMcpTool[];
  failures?: ReportFleetFailure[];
}

/**
 * Per-project movement. Derived, never read from `projects.status`: every
 * project in that table is 'active' and only a third carry a `current_state`,
 * so the column answers no question a reader actually has.
 */
export interface ReportProject {
  project_id: string;
  display_name: string;
  commits: number;
  sessions: number;
  vault_closed: number;
  vault_created: number;
  /** Null when the project moved today. Otherwise how long it has been quiet. */
  days_since_touched: number | null;
  note?: string;
}

export interface ReportCarriedDebt {
  item: string;
  days_carried: number;
}

/**
 * The day's tallies.
 *
 * Real and noise sessions are separate numbers rather than one total, because
 * the raw count actively misleads: a day recording 138 sessions had 117
 * sub-minute shell invocations in it. There is deliberately no total-minutes
 * field — shells run concurrently and the durations sum past 24 hours.
 */
export interface ReportCounts {
  sessions_real?: number;
  sessions_noise?: number;
  commits?: number;
  tasks_created?: number;
  tasks_closed?: number;
  longest_session_minutes?: number;
}

export interface DayReportPayload {
  headline?: string;
  /** The prose account. The reason this feature exists. */
  narrative?: string;
  arcs?: ReportArc[];
  fleet?: ReportFleet;
  projects?: ReportProject[];
  carried_debt?: ReportCarriedDebt[];
  counts?: ReportCounts;
}

export interface DayReport {
  /** Logical day (04:00 cutover), matching day checks, commitments and reflection. */
  day: string;
  generated_at: string;
  /** Which job wrote it, so a bad report is traceable to a run on the fleet page. */
  generator: string;
  /** The model that authored the prose — first thing to check when quality drops. */
  model: string | null;
  payload: DayReportPayload;
}

export interface DayReportSummary {
  day: string;
  generated_at: string;
  generator: string;
  model: string | null;
  headline: string | null;
}
