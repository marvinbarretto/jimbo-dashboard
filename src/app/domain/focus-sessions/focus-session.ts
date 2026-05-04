import type { FocusSessionId, ProjectId } from '../ids';

// A unit of focused time, optionally allocated to a project.
// The server holds canonical state — the timer page just renders a countdown
// against `started_at + planned_seconds`. That way the same row can be
// observed from multiple devices, and a tab close doesn't lose the session.
export type FocusSessionStatus = 'running' | 'completed' | 'abandoned';

export interface FocusSession {
  id:              FocusSessionId;
  project_id:      ProjectId | null;     // null = unassigned focus
  started_at:      string;                // ISO
  ended_at:        string | null;
  planned_seconds: number;
  actual_seconds:  number | null;        // filled on complete/abandon
  status:          FocusSessionStatus;
  notes:           string | null;
  tags:            string[];
  created_at:      string;
}

export interface StartFocusSessionPayload {
  project_id?:     string | null;
  planned_seconds: number;
  notes?:          string;
  tags?:           string[];
}

export interface CompleteFocusSessionPayload {
  notes?: string;
  tags?:  string[];
}
