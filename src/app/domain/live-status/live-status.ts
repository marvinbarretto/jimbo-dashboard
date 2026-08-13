// GET /api/live-status — the server-composed "what is happening right now"
// snapshot. Mirrors LiveStatusSchema in jimbo-api/src/schemas/code-sessions.ts;
// the dashboard has no generated client for this endpoint, so the contract is
// mirrored by hand the way the briefing types are.
//
// It lives in domain/ rather than under a feature because it's a composite of
// four domains at once — code sessions, health, dispatch and the vault — and
// belongs to none of them.
//
// Two traps this file can't fix, only document:
//  - `focus` is a *code* session (Claude Code, Cursor), not a pomodoro. It has
//    no planned duration, and when `actor` is set it isn't even Marvin. Never
//    render it as the focus timer; that's FocusSessionsService's job.
//  - `upcoming[].time` is UTC — the API builds it with toISOString().slice(11,16),
//    so an 11:30 standup reads "10:30" in BST. Derive from `in_minutes` instead.

export type CodeSessionSource = 'claude_code' | 'cursor' | 'aider' | 'other';
export type FrictionLevel = 'low' | 'medium' | 'high';
export type AgainstPlan = 'on-track' | 'off-track' | 'unknown';

export interface LiveFocus {
  source: CodeSessionSource;
  project: string | null;
  repo: string | null;
  session_started: string;
  minutes_elapsed: number;
  headline: string | null;
  friction: FrictionLevel | null;
  /** null = Marvin's own session; 'boris'/'kipper' = an executor, not human focus. */
  actor: string | null;
  /** Started before today's logical-day boundary — carried over, not evidence of focus today. */
  started_before_today: boolean;
}

export interface LiveToday {
  code_sessions: number;
  code_minutes: number;
  projects_touched: string[];
  commits: number;
  tasks_completed: number;
  tasks_created: number;
  pomo_sessions: number;
  activity_entries: number;
  /** From pomo retros (-1..1); null when there were no pomos. */
  mood_avg: number | null;
  friction: FrictionLevel | null;
  /** Health Connect telemetry. null = no reading, which is not the same as zero. */
  steps: number | null;
  active_calories: number | null;
  sleep_hours: number | null;
}

/**
 * A backlog, not an alert — the live call routinely carries 20+. Anything that
 * renders this as a count puts a permanent badge on screen and teaches
 * dismissal, so the home screen deliberately ignores it.
 */
export type LiveBlocker =
  | { type: 'overdue'; note_id: string; title: string; days_overdue: number }
  | { type: 'dependency'; note_id: string; title: string; blocked_by: string }
  | { type: 'friction'; session_id: string; title: string };

export interface DispatchPulse {
  waiting_on_marvin: number;
  running: number;
  completed_today: number;
  failed: number;
}

export interface VaultPulse {
  inbox_count: number;
  overdue: number;
  ready: number;
  /** Completed per day, trailing 7 days. */
  velocity_7d: number;
}

export interface UpcomingEvent {
  /** UTC HH:MM — see the note at the top of this file. Prefer in_minutes. */
  time: string;
  title: string;
  source: 'calendar';
  in_minutes: number;
}

/** Only populated when the caller passes ?since=<ISO>; the dashboard doesn't. */
export interface LiveStatusDelta {
  since: string;
  has_changes: boolean;
  focus_changed: boolean;
  new_code_sessions: number;
  tasks_completed: string[];
  tasks_created: string[];
  new_blockers: LiveBlocker[];
}

export interface LiveStatus {
  /** Server clock (ISO). */
  now: string;
  generated_at: string;
  focus: LiveFocus | null;
  today: LiveToday;
  briefing: {
    /** Raw text from today's briefing day_plan window. */
    plan_for_now: string | null;
    /** v1 heuristic — project-name match, not an LLM verdict. */
    against_plan: AgainstPlan;
  };
  blockers: LiveBlocker[];
  dispatch_pulse: DispatchPulse;
  vault_pulse: VaultPulse;
  upcoming: UpcomingEvent[];
  delta: LiveStatusDelta | null;
}
