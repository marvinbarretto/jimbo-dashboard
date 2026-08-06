import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableShell } from '@shared/components/table-shell/table-shell';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { relativeTime } from '@shared/utils/datetime.utils';
import { MailTabs } from '../../components/mail-tabs/mail-tabs';
import { GateRunsService, type GateRun } from '../../gate-runs.service';
import { type EmailReport, type EmailVerdict, isRetained } from '../../mail-activity.service';

const VERDICT_ORDER: EmailVerdict[] = ['alert', 'fact', 'event', 'reference', 'keep', 'toss'];

/**
 * Every gate run, and inside each one every decision with the reason it was
 * made — the audit surface.
 *
 * A run is not a stored entity: gate-emails PATCHes each email individually
 * and nothing records the batch, so the API reconstructs runs by clustering
 * gated_at. See the sessionization note in jimbo-api services/emails.ts.
 */
@Component({
  selector: 'app-gate-runs-page',
  imports: [
    MailTabs, RouterLink, TableShell, UiBadge, UiCluster,
    UiPage, UiPageHeader, UiStack, UiStatCard,
  ],
  templateUrl: './gate-runs-page.html',
  styleUrl: './gate-runs-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GateRunsPage implements OnInit {
  private readonly svc = inject(GateRunsService);

  protected readonly runs = this.svc.runs;
  protected readonly loading = this.svc.loading;
  protected readonly lastError = this.svc.lastError;
  protected readonly decisions = this.svc.decisions;
  protected readonly decisionsLoading = this.svc.decisionsLoading;

  protected readonly expandedRunId = signal<string | null>(null);

  protected readonly totalGated = computed(() =>
    this.runs().reduce((n, r) => n + r.total, 0),
  );
  protected readonly totalKept = computed(() =>
    this.runs().reduce((n, r) => n + r.kept, 0),
  );
  /** kept - filed: the gate decided to keep something and then never filed it. */
  protected readonly silentLoss = computed(() =>
    this.runs().reduce((n, r) => n + (r.kept - r.filed), 0),
  );
  protected readonly keepRate = computed(() => {
    const t = this.totalGated();
    return t === 0 ? '—' : `${Math.round((this.totalKept() / t) * 100)}%`;
  });

  ngOnInit(): void {
    void this.svc.load();
  }

  protected toggle(run: GateRun): void {
    if (this.expandedRunId() === run.run_id) {
      this.expandedRunId.set(null);
      return;
    }
    this.expandedRunId.set(run.run_id);
    void this.svc.loadDecisions(run.run_id);
  }

  /** Ordered by consequence, not alphabetically — an alert matters more than
   *  a reference, and the eye should hit it first. */
  protected verdictChips(run: GateRun): { verdict: string; count: number }[] {
    return VERDICT_ORDER
      .filter(v => run.by_verdict[v])
      .map(v => ({ verdict: v, count: run.by_verdict[v] }));
  }

  protected verdictTone(verdict: string | null): 'success' | 'neutral' | 'warning' | 'info' {
    if (verdict === 'alert') return 'warning';
    if (verdict === 'toss') return 'neutral';
    if (isRetained(verdict as EmailVerdict)) return 'success';
    return 'info';
  }

  /** A run that kept something but filed less than it kept lost work. */
  protected lostWork(run: GateRun): number {
    return run.kept - run.filed;
  }

  protected when(iso: string): string {
    return relativeTime(iso);
  }

  protected duration(run: GateRun): string {
    const ms = new Date(run.ended_at).getTime() - new Date(run.started_at).getTime();
    if (!Number.isFinite(ms) || ms < 1000) return '<1s';
    return ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 60_000)}m`;
  }

  protected isKept(d: EmailReport): boolean {
    return isRetained(d.verdict);
  }

  protected trackDecision(_i: number, d: EmailReport): string {
    return d.gmail_id;
  }
}
