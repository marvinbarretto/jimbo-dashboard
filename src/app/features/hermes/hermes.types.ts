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
