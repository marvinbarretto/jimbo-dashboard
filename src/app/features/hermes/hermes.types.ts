export interface HermesJob {
  id: string;
  name: string;
  state: string;
  enabled: boolean;
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
  deliver: string | null;
  prompt: string | null;
  skills: string[] | null;
  model: string | null;
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
  source: string;
  last_modified: string | null;
  read_at: string;
}
