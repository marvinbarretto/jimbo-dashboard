import type { FocusSessionId, ProjectId } from '../ids';

// A unit of focused time, optionally allocated to a project.
// The server holds canonical state — the timer page just renders a countdown
// against `started_at + planned_seconds`. That way the same row can be
// observed from multiple devices, and a tab close doesn't lose the session.
export type FocusSessionStatus = 'running' | 'completed' | 'abandoned';
export type SessionMood = -1 | 0 | 1;

export interface ActivitySummary {
  tab_switches:        number;
  distinct_domains:    number;
  top_domain:          string | null;
  top_domain_seconds:  number;
  focus_ratio:         number;
  idle_seconds:        number;
  unfocused_seconds:   number;
  unaccounted_seconds: number;
  domain_breakdown:    Array<{ domain: string; seconds: number }>;
}

export interface FocusSession {
  id:              FocusSessionId;
  project_id:      ProjectId | null;
  started_at:      string;
  ended_at:        string | null;
  planned_seconds: number;
  actual_seconds:  number | null;
  status:          FocusSessionStatus;
  mood:            SessionMood | null;
  interrupted:     boolean;
  notes:           string | null;
  tags:            string[];
  activity:        ActivitySummary | null;
  created_at:      string;
}

export interface StartFocusSessionPayload {
  project_id?:     string | null;
  planned_seconds: number;
  notes?:          string;
  tags?:           string[];
}

export interface CompleteFocusSessionPayload {
  notes?:       string;
  tags?:        string[];
  mood?:        SessionMood;
  interrupted?: boolean;
}

export interface UpdateFocusSessionPayload {
  notes?:       string | null;
  tags?:        string[];
  mood?:        SessionMood | null;
  interrupted?: boolean;
}

// A git commit (or push) captured against the session by a client-side hook,
// surfaced on the /pomo retro page so you can see what actually shipped.
export type FocusSessionCommitEvent = 'commit' | 'push';

export interface FocusSessionCommit {
  id:           string;
  session_id:   FocusSessionId;
  commit_sha:   string;
  message:      string;
  author:       string | null;
  repo:         string | null;
  branch:       string | null;
  event_type:   FocusSessionCommitEvent;
  committed_at: string;
  recorded_at:  string;
}
