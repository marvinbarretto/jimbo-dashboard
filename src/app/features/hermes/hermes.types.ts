/**
 * Derived server-side (jimbo-api `classifyJobHealth`), not from `last_status`.
 *
 * `last_status` alone cannot answer "is this broken now?" — a paused job holds
 * whatever status it carried into the pause forever, which is how a July
 * OpenRouter 402 on mood-checkin-tick rendered as a live failure for 42 days.
 * `failing` is the only value that earns red.
 */
export type HermesJobHealth = 'failing' | 'stale_error' | 'paused' | 'disabled' | 'ok';

export interface HermesJob {
  id: string;
  name: string;
  state: string;
  enabled: boolean;
  health: HermesJobHealth;
  schedule_display: string | null;
  paused_at: string | null;
  paused_reason: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
  last_delivery_error: string | null;
  runs_completed: number | null;
  skill: string | null;
  // Pre-run script. When set it often acts as a skip-gate: if it prints
  // "[SKIP]" the scheduler aborts the run before any model call.
  script: string | null;
  deliver: string | null;
  prompt: string | null;
  skills: string[] | null;
  model: string | null;
  // Inference backend the job is pinned to (null = inherit the global default).
  provider: string | null;
  created_at: string | null;
}

export interface HermesRun {
  runId: string;
  run_at: string;
  duration_seconds: number | null;
  file_size_bytes: number;
}

export interface HermesRunOutput {
  runId: string;
  run_at: string;
  response: string;
  has_tool_calls: boolean;
  response_chars: number;
  tool_calls: string[];
}

export interface HermesRunsResponse {
  jobId: string;
  runs: HermesRun[];
  total: number;
}

export interface HermesSnapshot {
  jobs: HermesJob[];
  total: number;
  paused_count: number;
  failing_count: number;
  stale_error_count: number;
  source: string;
  last_modified: string | null;
  read_at: string;
}

export interface HermesModelTiers {
  cheap: string;
  balanced: string;
  capable: string;
}

export interface HermesModelPrefs {
  tiers: HermesModelTiers;
  default: string;
  auxiliary: Record<string, string>;
}
