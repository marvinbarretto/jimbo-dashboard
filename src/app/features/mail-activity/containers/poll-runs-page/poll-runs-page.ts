import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { TableShell } from '@shared/components/table-shell/table-shell';
import { relativeTime } from '@shared/utils/datetime.utils';
import { MailTabs } from '../../components/mail-tabs/mail-tabs';
import { PollRunsService, type PollRun } from '../../poll-runs.service';

/** A sweep that ran past this is presumed hung — the median is ~20 minutes and
 *  launchd enforces no timeout, so hangs only show up here. */
const HUNG_MS = 45 * 60 * 1000;

interface DayRow {
  day: string;
  runs: number;
  msgs: number;
  ok: number;
  errors: number;
  links: number;
  minutes: number;
  hung: number;
}

/**
 * The acquisition layer under every mail page: kipper's hourly Gmail sweeps
 * on the M4. Activity/Runs/Senders show what the gate decided; this page shows
 * whether the mail is being fetched at all — a machine asleep all day looks
 * healthy everywhere else because nothing arrives to be judged.
 */
@Component({
  selector: 'app-poll-runs-page',
  imports: [RouterLink, MailTabs, TableShell, UiBadge, UiCluster, UiPage, UiPageHeader, UiStack, UiStatCard],
  templateUrl: './poll-runs-page.html',
  styleUrl: './poll-runs-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollRunsPage implements OnInit {
  private readonly svc = inject(PollRunsService);

  protected readonly runs = this.svc.runs;
  protected readonly loading = this.svc.loading;
  protected readonly lastError = this.svc.lastError;

  protected readonly lastRunAgo = computed(() => {
    const [latest] = this.runs();
    return latest ? relativeTime(latest.ts) : '—';
  });

  /** Freshness is the page's headline: stale mail is invisible everywhere else. */
  protected readonly lastRunStale = computed(() => {
    const [latest] = this.runs();
    if (!latest) return true;
    return Date.now() - new Date(latest.ts).getTime() > 3 * 60 * 60 * 1000;
  });

  protected readonly totalMsgs = computed(() =>
    this.runs().reduce((n, r) => n + r.total, 0),
  );

  protected readonly errorRate = computed(() => {
    const t = this.totalMsgs();
    if (t === 0) return '—';
    const errs = this.runs().reduce((n, r) => n + r.errors, 0);
    return `${Math.round((errs / t) * 100)}%`;
  });

  protected readonly hoursPerDay = computed(() => {
    const days = this.days();
    if (days.length === 0) return '—';
    const totalMinutes = days.reduce((n, d) => n + d.minutes, 0);
    return `${(totalMinutes / 60 / days.length).toFixed(1)}h`;
  });

  protected readonly hungRuns = computed(() =>
    this.runs().filter((r) => (r.durationMs ?? 0) > HUNG_MS).length,
  );

  protected readonly days = computed<DayRow[]>(() => {
    const byDay = new Map<string, DayRow>();
    for (const r of this.runs()) {
      const day = r.ts.slice(0, 10);
      const row = byDay.get(day) ?? {
        day, runs: 0, msgs: 0, ok: 0, errors: 0, links: 0, minutes: 0, hung: 0,
      };
      row.runs += 1;
      row.msgs += r.total;
      row.ok += r.ok;
      row.errors += r.errors;
      row.links += r.linksFollowed;
      row.minutes += (r.durationMs ?? 0) / 60_000;
      if ((r.durationMs ?? 0) > HUNG_MS) row.hung += 1;
      byDay.set(day, row);
    }
    return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
  });

  ngOnInit(): void {
    void this.svc.load();
  }

  protected when(run: PollRun): string {
    return relativeTime(run.ts);
  }

  protected duration(run: PollRun): string {
    const ms = run.durationMs;
    if (ms === null) return '—';
    return ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 60_000)}m`;
  }

  protected isHung(run: PollRun): boolean {
    return (run.durationMs ?? 0) > HUNG_MS;
  }

  protected minutesLabel(d: DayRow): string {
    return `${Math.round(d.minutes)}m`;
  }

  /** A count the run never recorded is '—', never 0 — an unmeasured zero must
   *  not read as a measured one. */
  protected countOrDash(n: number | null): string {
    return n === null ? '—' : n.toString();
  }

  protected rawForward(run: PollRun): string {
    if (!run.rawLaneOn) return run.rawForwarded === null ? '—' : 'off';
    return this.countOrDash(run.rawForwarded);
  }

  protected rawForwardTitle(run: PollRun): string {
    if (run.rawForwarded === null && !run.rawLaneOn) {
      return 'This run predates raw-lane recording — not measured either way';
    }
    if (!run.rawLaneOn) return 'The LocalShout raw lane was not configured on this host';
    const attempted = run.rawAttempted;
    return attempted === null
      ? 'Raw messages forwarded to LocalShout'
      : `${run.rawForwarded ?? 0} of ${attempted} raw messages forwarded to LocalShout`;
  }
}
