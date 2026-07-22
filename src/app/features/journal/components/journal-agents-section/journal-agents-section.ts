import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { ToastService } from '@shared/components/toast/toast.service';
import {
  AgentRunsService,
  type AgentRunOutcome,
  type AgentRunRollupRow,
  type JobRatingValue,
} from '../../../hermes/data-access/agent-runs.service';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const ERROR_OUTCOMES: ReadonlySet<AgentRunOutcome> = new Set([
  'CREDIT_402', 'QUOTA_403', 'AUTH_403', 'AUTH_ERR', 'RATE_429',
  'UPSTREAM_5XX', 'API_FAIL', 'POLL_CORRUPTED',
]);

const OUTCOME_TONE: Record<AgentRunOutcome, Tone> = {
  CREDIT_402:     'danger',
  QUOTA_403:      'danger',
  AUTH_403:       'danger',
  AUTH_ERR:       'danger',
  RATE_429:       'warning',
  UPSTREAM_5XX:   'warning',
  API_FAIL:       'warning',
  POLL_CORRUPTED: 'warning',
  PROSE_RESPONSE: 'info',
  POLL_NO_WORK:   'neutral',
};

const OUTCOME_LABEL: Record<AgentRunOutcome, string> = {
  CREDIT_402: '402 credit', QUOTA_403: '403 quota', AUTH_403: 'auth',
  AUTH_ERR: 'auth', RATE_429: '429 rate', UPSTREAM_5XX: '5xx',
  API_FAIL: 'api fail', POLL_CORRUPTED: 'corrupt',
  PROSE_RESPONSE: 'prose', POLL_NO_WORK: 'silent',
};

interface FailingCron {
  job_name: string;
  model: string | null;
  outcome: AgentRunOutcome;
  count: number;
}

interface JobCost {
  job_name: string;
  cost: number;
  tokens: number;
  runs: number;
  rating: JobRatingValue | null;
}

@Component({
  selector: 'app-journal-agents-section',
  imports: [
    RouterLink,
    UiBadge,
    UiEmptyState,
    UiLoadingState,
    UiSection,
    UiStack,
    UiStatCard,
    UiSubhead,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-agents-section.html',
  styleUrl: './journal-agents-section.scss',
})
export class JournalAgentsSection {
  private readonly service = inject(AgentRunsService);
  private readonly toasts = inject(ToastService);

  // Exact [since, until) ISO instants — the owning page supplies local
  // period boundaries (day, week or month). Hermes stores UTC instants;
  // the boundary is ours. Optional (not required) so the resource's request
  // fn can run before inputs bind and return undefined = "not yet".
  readonly since = input<string>();
  readonly until = input<string>();

  // Per-job usefulness verdicts (keep/watch/cut). Loaded once; updated
  // optimistically on click. Ratings are per-job, not per-day, so a single
  // fetch is enough.
  private readonly ratingsSig = signal<Record<string, JobRatingValue>>({});
  readonly ratingValues: readonly JobRatingValue[] = ['keep', 'watch', 'cut'];

  constructor() {
    this.service.ratings().subscribe((r) => {
      const m: Record<string, JobRatingValue> = {};
      for (const it of r.items) m[it.job_name] = it.rating;
      this.ratingsSig.set(m);
    });

    // 60s keep-fresh, but only while the window includes now — historical
    // periods are immutable and don't need polling.
    const id = setInterval(() => {
      const until = this.until();
      if (until && Date.parse(until) > Date.now()) this.rollupRes.reload();
    }, 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  rate(jobName: string, rating: JobRatingValue): void {
    const previous = this.ratingsSig()[jobName];
    this.ratingsSig.update((m) => ({ ...m, [jobName]: rating }));   // optimistic
    this.service.setRating(jobName, rating).subscribe({
      // Roll the optimistic update back. Swallowing the error left a verdict
      // on screen that had never reached the server, and it survived until
      // the next reload — the rating looked saved when it wasn't.
      error: () => {
        this.ratingsSig.update((m) => {
          const next = { ...m };
          if (previous === undefined) delete next[jobName];
          else next[jobName] = previous;
          return next;
        });
        this.toasts.error(`Couldn't save the “${jobName}” rating`);
      },
    });
  }

  // httpResource keyed on the window inputs: refetches (and aborts in-flight)
  // when the period changes, no rxjs plumbing.
  private readonly rollupRes = httpResource<{ items: AgentRunRollupRow[] }>(() => {
    const since = this.since();
    const until = this.until();
    if (!since || !until) return undefined;
    return `${environment.dashboardApiUrl}/api/agent-runs/rollup?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`;
  });

  readonly loading = computed(() => this.rollupRes.isLoading() && !this.rollupRes.hasValue());
  readonly items = computed<AgentRunRollupRow[]>(() =>
    this.rollupRes.hasValue() ? (this.rollupRes.value().items ?? []) : []);

  // Collapse the section once we know there's nothing for the day; stay open
  // while loading so a data-bearing day never flickers shut. User-toggleable.
  readonly open = linkedSignal(() => this.loading() || this.totalTicks() > 0);

  readonly totalTicks = computed(() => this.items().reduce((s, r) => s + r.count, 0));

  readonly errorCount = computed(() =>
    this.items().filter((r) => ERROR_OUTCOMES.has(r.outcome)).reduce((s, r) => s + r.count, 0));

  readonly silentCount = computed(() =>
    this.items().filter((r) => r.outcome === 'POLL_NO_WORK').reduce((s, r) => s + r.count, 0));

  readonly proseCount = computed(() =>
    this.items().filter((r) => r.outcome === 'PROSE_RESPONSE').reduce((s, r) => s + r.count, 0));

  readonly failingCrons = computed<FailingCron[]>(() =>
    [...this.items()]
      .filter((r) => ERROR_OUTCOMES.has(r.outcome))
      .sort((a, b) => b.count - a.count),
  );

  // Crons whose only outcome today is POLL_NO_WORK. Useful for spotting when
  // the pump never enqueued anything — silent failure with no explicit error.
  readonly quietCrons = computed<string[]>(() => {
    const byJob = new Map<string, Set<AgentRunOutcome>>();
    for (const r of this.items()) {
      const set = byJob.get(r.job_name) ?? new Set();
      set.add(r.outcome);
      byJob.set(r.job_name, set);
    }
    const quiet: string[] = [];
    for (const [job, outcomes] of byJob) {
      if (outcomes.size === 1 && outcomes.has('POLL_NO_WORK')) quiet.push(job);
    }
    return quiet.sort();
  });

  // Estimated total agent cost for the day (cost_usd is backfilled onto
  // agent.end from the runner's per-session accounting; null on pre-backfill
  // or zero-cost runs). This is an ESTIMATE — reconcile against OpenRouter's
  // daily total, which also captures auxiliary (non-cron-session) calls.
  readonly totalCost = computed(() =>
    this.items().reduce((s, r) => s + (r.cost_usd ?? 0), 0));

  // Per-job spend breakdown — the "what's costing money" table. Highest first.
  readonly costByJob = computed<JobCost[]>(() => {
    const ratings = this.ratingsSig();
    const m = new Map<string, JobCost>();
    for (const r of this.items()) {
      const j = m.get(r.job_name)
        ?? { job_name: r.job_name, cost: 0, tokens: 0, runs: 0, rating: ratings[r.job_name] ?? null };
      j.cost += r.cost_usd ?? 0;
      j.tokens += r.tokens_total ?? 0;
      j.runs += r.count;
      j.rating = ratings[r.job_name] ?? null;
      m.set(r.job_name, j);
    }
    return [...m.values()].filter((j) => j.cost > 0).sort((a, b) => b.cost - a.cost);
  });

  fmtCost(n: number): string { return '$' + n.toFixed(n < 0.1 ? 4 : 2); }
  fmtTokens(n: number): string { return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n); }

  readonly sectionMeta = computed(() => {
    const t = this.totalTicks();
    if (t === 0) return 'no activity';
    const errs = this.errorCount();
    return errs > 0 ? `${t} ticks · ${errs} failed` : `${t} ticks`;
  });

  outcomeTone(o: AgentRunOutcome): Tone { return OUTCOME_TONE[o]; }
  outcomeLabel(o: AgentRunOutcome): string { return OUTCOME_LABEL[o]; }
}
