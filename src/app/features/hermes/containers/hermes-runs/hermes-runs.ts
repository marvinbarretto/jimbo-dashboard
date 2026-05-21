import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { absoluteTime, relativeTime } from '@shared/utils/datetime.utils';
import { Observable, catchError, map, of, shareReplay, switchMap, timer } from 'rxjs';
import { AgentRunsService, type AgentRunOutcome, type AgentRunRollupRow, type AgentRunTailRow } from '../../data-access/agent-runs.service';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

// Outcome → tone + display label. Single source so badges + cells stay aligned.
const OUTCOME_META: Record<AgentRunOutcome, { tone: Tone; short: string }> = {
  CREDIT_402:     { tone: 'danger',  short: '402' },
  QUOTA_403:      { tone: 'danger',  short: '403' },
  AUTH_403:       { tone: 'danger',  short: 'auth' },
  AUTH_ERR:       { tone: 'danger',  short: 'auth' },
  RATE_429:       { tone: 'warning', short: '429' },
  UPSTREAM_5XX:   { tone: 'warning', short: '5xx' },
  API_FAIL:       { tone: 'warning', short: 'api' },
  POLL_CORRUPTED: { tone: 'warning', short: 'corrupt' },
  PROSE_RESPONSE: { tone: 'info',    short: 'prose' },
  POLL_NO_WORK:   { tone: 'neutral', short: 'silent' },
};

const ERROR_OUTCOMES: ReadonlySet<AgentRunOutcome> = new Set([
  'CREDIT_402', 'QUOTA_403', 'AUTH_403', 'AUTH_ERR', 'RATE_429',
  'UPSTREAM_5XX', 'API_FAIL', 'POLL_CORRUPTED',
]);

interface JobSummary {
  job_name: string;
  models: string[];
  total: number;
  by_outcome: Map<AgentRunOutcome, number>;
  last_ts: string;
  health: 'green' | 'amber' | 'red';
  health_reason: string;
}

@Component({
  selector: 'app-hermes-runs',
  imports: [UiBadge, UiLoadingState, UiSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hermes-runs.html',
  styleUrl: './hermes-runs.scss',
})
export class HermesRuns {
  private readonly service = inject(AgentRunsService);

  readonly windowDays = signal(7);
  readonly tailLimit = signal(50);

  // 30s poll on both endpoints. Cron tick floor is 15min so this is generous.
  private readonly rollup$: Observable<{ items: AgentRunRollupRow[] } | null> = timer(0, 30_000).pipe(
    switchMap(() => this.service.rollup({ days: this.windowDays() }).pipe(catchError(() => of(null)))),
    shareReplay(1),
  );
  private readonly tail$: Observable<{ items: AgentRunTailRow[] } | null> = timer(0, 30_000).pipe(
    switchMap(() => this.service.tail(this.tailLimit()).pipe(catchError(() => of(null)))),
    shareReplay(1),
  );

  readonly rollup = toSignal(this.rollup$.pipe(map((r) => r?.items ?? [])), { initialValue: [] });
  readonly tail   = toSignal(this.tail$.pipe(map((r) => r?.items ?? [])), { initialValue: [] });

  // Aggregate rollup rows up to job_name level. Models often rotate within a
  // single cron's history, so we want to show the union and let the per-outcome
  // chips communicate which model produced what.
  readonly jobs = computed<JobSummary[]>(() => {
    const rows = this.rollup();
    const tail = this.tail();
    const map = new Map<string, JobSummary>();
    for (const r of rows) {
      let s = map.get(r.job_name);
      if (!s) {
        s = {
          job_name: r.job_name,
          models: [],
          total: 0,
          by_outcome: new Map(),
          last_ts: r.last_ts,
          health: 'green',
          health_reason: '',
        };
        map.set(r.job_name, s);
      }
      if (r.model && !s.models.includes(r.model)) s.models.push(r.model);
      s.total += r.count;
      s.by_outcome.set(r.outcome, (s.by_outcome.get(r.outcome) ?? 0) + r.count);
      if (r.last_ts > s.last_ts) s.last_ts = r.last_ts;
    }
    // Health from the tail: last 5 rows for this job. Red if all errors,
    // amber if any errors, green otherwise. Tail is authoritative because it
    // captures *current* state — the window aggregate can hide a recent recovery.
    for (const s of map.values()) {
      const recent = tail.filter((t) => t.job_name === s.job_name).slice(0, 5);
      if (recent.length === 0) {
        s.health = 'amber';
        s.health_reason = 'no runs in tail';
        continue;
      }
      const errorCount = recent.filter((t) => ERROR_OUTCOMES.has(t.outcome)).length;
      if (errorCount === recent.length) {
        s.health = 'red';
        s.health_reason = `last ${recent.length} runs failed (${recent[0]?.outcome})`;
      } else if (errorCount > 0) {
        s.health = 'amber';
        s.health_reason = `${errorCount}/${recent.length} recent failed`;
      } else {
        s.health = 'green';
        s.health_reason = `${recent.length} clean runs`;
      }
    }
    return [...map.values()].sort((a, b) => {
      const rank = { red: 0, amber: 1, green: 2 } as const;
      const cmp = rank[a.health] - rank[b.health];
      return cmp !== 0 ? cmp : a.job_name.localeCompare(b.job_name);
    });
  });

  readonly outcomeOrder: AgentRunOutcome[] = [
    'CREDIT_402', 'QUOTA_403', 'AUTH_403', 'AUTH_ERR', 'RATE_429',
    'UPSTREAM_5XX', 'API_FAIL', 'POLL_CORRUPTED', 'PROSE_RESPONSE', 'POLL_NO_WORK',
  ];

  outcomeTone(o: AgentRunOutcome): Tone     { return OUTCOME_META[o].tone; }
  outcomeShort(o: AgentRunOutcome): string  { return OUTCOME_META[o].short; }
  outcomeLong(o: AgentRunOutcome): string   { return o.replace(/_/g, ' ').toLowerCase(); }

  healthTone(h: 'green' | 'amber' | 'red'): Tone {
    return h === 'red' ? 'danger' : h === 'amber' ? 'warning' : 'success';
  }

  jobCount(s: JobSummary, outcome: AgentRunOutcome): number {
    return s.by_outcome.get(outcome) ?? 0;
  }

  setWindow(days: number): void { this.windowDays.set(days); }

  protected readonly relativeTime = relativeTime;
  protected readonly absoluteTime = absoluteTime;
}
