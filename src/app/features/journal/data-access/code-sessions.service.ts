// Read access to jimbo-api code sessions — the Claude Code SessionStart/End
// hook captures. These are the densest "real desk work" signal we have
// (richer than pomodoros: headline/bullets/narrative are narrated at session
// end), so the journal leans on them for reconstructing what a day held.

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type CodeSessionSource = 'claude_code' | 'cursor' | 'aider' | 'other';
export type CodeSessionStatus = 'running' | 'completed' | 'abandoned';
export type CodeSessionOutcome = 'completed' | 'partial' | 'abandoned' | 'unknown';
export type FrictionLevel = 'low' | 'medium' | 'high';

export interface CodeSessionCommit {
  readonly sha: string;
  readonly subject: string;
}

export interface CodeSessionArtifacts {
  readonly commits: readonly CodeSessionCommit[];
  readonly files_touched: number;
  readonly top_files: readonly string[];
  readonly prs: readonly string[];
  readonly tests_run: boolean | null;
  readonly tests_passed: boolean | null;
}

export interface CodeSessionFriction {
  readonly turns: number;
  readonly corrections: number;
  readonly level: FrictionLevel;
}

export interface CodeSession {
  readonly id: string;
  readonly session_id: string;
  readonly source: CodeSessionSource;
  readonly status: CodeSessionStatus;
  readonly started_at: string;
  readonly ended_at: string | null;
  readonly duration_minutes: number | null;
  readonly cwd: string;
  readonly repo: string | null;
  readonly branch: string | null;
  // null = Marvin's interactive session; 'boris'/'kipper' = automated executor
  readonly actor: string | null;
  readonly project_id: string | null;
  readonly headline: string | null;
  readonly bullets: readonly string[];
  readonly narrative: string | null;
  readonly next_steps: readonly string[];
  readonly topics: readonly string[];
  readonly artifacts: CodeSessionArtifacts;
  readonly friction: CodeSessionFriction | null;
  readonly outcome: CodeSessionOutcome | null;
}

@Injectable({ providedIn: 'root' })
export class CodeSessionsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  list(params: { since: string; until: string; limit?: number }): Observable<{ items: CodeSession[] }> {
    const q = new URLSearchParams({
      since: params.since,
      until: params.until,
      limit: String(params.limit ?? 100),
    });
    return this.http.get<{ items: CodeSession[] }>(`${this.base}/api/code-sessions?${q}`);
  }
}
