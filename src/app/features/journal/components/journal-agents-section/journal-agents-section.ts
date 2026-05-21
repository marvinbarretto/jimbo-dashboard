import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { catchError, of, switchMap, timer } from 'rxjs';
import {
  AgentRunsService,
  type AgentRunOutcome,
  type AgentRunRollupRow,
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

  // YYYY-MM-DD. Treated as a UTC day window — Hermes timestamps are stored UTC.
  readonly date = input.required<string>();

  // Refresh every 60s. Cheap query, view-only.
  private readonly result = toSignal(
    timer(0, 60_000).pipe(
      switchMap(() => this.service.rollup({
        since: `${this.date()}T00:00:00Z`,
        until: `${this.date()}T23:59:59.999Z`,
      }).pipe(catchError(() => of({ items: [] as AgentRunRollupRow[] })))),
    ),
    { initialValue: null },
  );

  readonly loading = computed(() => this.result() === null);
  readonly items = computed<AgentRunRollupRow[]>(() => this.result()?.items ?? []);

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

  readonly sectionMeta = computed(() => {
    const t = this.totalTicks();
    if (t === 0) return 'no activity';
    const errs = this.errorCount();
    return errs > 0 ? `${t} ticks · ${errs} failed` : `${t} ticks`;
  });

  outcomeTone(o: AgentRunOutcome): Tone { return OUTCOME_TONE[o]; }
  outcomeLabel(o: AgentRunOutcome): string { return OUTCOME_LABEL[o]; }
}
