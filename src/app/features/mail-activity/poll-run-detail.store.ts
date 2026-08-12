import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PollRunsService, type PollRun } from './poll-runs.service';

/**
 * One kipper sweep, and every email it discovered.
 *
 * Two sources, deliberately: the emails come from the API keyed on the
 * stamped `poll_run_id` (an exact lookup, not a timestamp window), and the
 * run's own totals come from its `agent.end` event — which is the only place
 * the work the sweep DECLINED is recorded, since a blacklisted message never
 * becomes a row anywhere.
 */
export interface PollRunEmail {
  gmail_id: string;
  subject: string | null;
  from_name: string | null;
  from_email: string;
  discovered_at: string;
  verdict: string | null;
  analysis_writer: string | null;
  links_followed: number | null;
  links_skipped: number | null;
  vault_note_seq: number | null;
  vault_note_title: string | null;
}

@Injectable({ providedIn: 'root' })
export class PollRunDetailStore {
  private readonly http = inject(HttpClient);
  private readonly pollRuns = inject(PollRunsService);

  private readonly runId = signal<string | null>(null);

  readonly emails = signal<PollRunEmail[]>([]);
  readonly loading = signal(false);
  readonly lastError = signal<string | null>(null);

  /** The run's summary row, once the runs list has loaded. Null while loading
   *  or when the id matches no run in the retained window. */
  readonly run = computed<PollRun | null>(() => {
    const id = this.runId();
    return id ? this.pollRuns.findByRunId(id) : null;
  });

  readonly currentRunId = computed(() => this.runId());

  /**
   * Emails this sweep discovered that were never analysed. The deep read can
   * fail per-message (an Ollama timeout is the common one) and the run summary
   * only carries a total — so without this the failure is a number with no
   * subjects attached.
   */
  readonly unanalysed = computed(() =>
    this.emails().filter((e) => e.links_followed === null && e.analysis_writer === null),
  );

  /** Links the sweep declined across every email it read. Null when no email
   *  recorded skips, so "not recorded" never renders as zero. */
  readonly totalLinksSkipped = computed<number | null>(() => {
    const recorded = this.emails().filter((e) => e.links_skipped !== null);
    if (recorded.length === 0) return null;
    return recorded.reduce((sum, e) => sum + (e.links_skipped ?? 0), 0);
  });

  async load(runId: string): Promise<void> {
    this.runId.set(runId);
    this.loading.set(true);
    this.lastError.set(null);
    try {
      // The runs list backs the summary panel; skip the refetch if the
      // poll-runs page already populated it this session.
      const runsLoaded = this.pollRuns.runs().length > 0
        ? Promise.resolve()
        : this.pollRuns.load();

      const [res] = await Promise.all([
        firstValueFrom(
          this.http.get<{ items: PollRunEmail[] }>(
            `/api/emails/poll-runs/${encodeURIComponent(runId)}/emails`,
          ),
        ),
        runsLoaded,
      ]);
      this.emails.set(res.items);
    } catch (err: unknown) {
      this.lastError.set(err instanceof Error ? err.message : 'Failed to load sweep');
    } finally {
      this.loading.set(false);
    }
  }
}
