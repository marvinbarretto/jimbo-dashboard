import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiBreadcrumb, type Crumb } from '@shared/components/ui-breadcrumb/ui-breadcrumb';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { TableShell } from '@shared/components/table-shell/table-shell';
import { relativeTime } from '@shared/utils/datetime.utils';
import { PollRunDetailStore, type PollRunEmail } from '../../poll-run-detail.store';
import { ANALYSIS_WRITER_LABEL, type AnalysisWriter } from '../../mail-activity.service';

/**
 * One kipper sweep, end to end: the mail it discovered, what it did with each
 * message, and — the half that was invisible until 2026-08-12 — the work it
 * declined.
 *
 * Reached from the poll-runs table, and from the "discovered in sweep" line on
 * any email detail page. Only runs that stamped a run id can be opened; older
 * sweeps have no way to name their mail except by timestamp proximity, and
 * that inference is exactly what the stamping replaced.
 */
@Component({
  selector: 'app-poll-run-detail',
  imports: [
    DatePipe, RouterLink, TableShell, UiBadge, UiBreadcrumb, UiCluster,
    UiEmptyState, UiPage, UiPageHeader, UiSection, UiStack, UiStatCard,
  ],
  templateUrl: './poll-run-detail.html',
  styleUrl: './poll-run-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollRunDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(PollRunDetailStore);

  // The sweep's stamped id (email_reports.poll_run_id), same value the run's
  // agent.end payload carries — that shared id is what makes this page a join
  // rather than a timestamp guess.
  protected readonly runId = toSignal(this.route.paramMap.pipe(map((p) => p.get('runId'))));

  constructor() {
    effect(() => {
      const id = this.runId();
      if (id) void this.store.load(id);
    });
  }

  protected readonly emails = this.store.emails;
  protected readonly loading = this.store.loading;
  protected readonly lastError = this.store.lastError;
  protected readonly run = this.store.run;
  protected readonly unanalysed = this.store.unanalysed;
  protected readonly totalLinksSkipped = this.store.totalLinksSkipped;

  protected readonly crumbs = computed<Crumb[]>(() => [
    { label: 'Mail', link: '/mail-activity' },
    { label: 'Poll runs', link: '/mail-activity/poll-runs' },
    { label: 'Sweep' },
  ]);

  protected when(): string {
    const r = this.run();
    return r ? relativeTime(r.ts) : '—';
  }

  protected duration(): string {
    const ms = this.run()?.durationMs;
    if (ms === null || ms === undefined) return '—';
    return ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 60_000)}m`;
  }

  /** A count the run never recorded is '—', never 0 — the difference between
   *  "declined nothing" and "we don't know" is the whole point of this page. */
  protected countOrUnrecorded(n: number | null | undefined): string {
    return n === null || n === undefined ? 'not recorded' : n.toString();
  }

  protected writerLabel(writer: string | null): string {
    if (writer === null) return 'unattributed';
    return ANALYSIS_WRITER_LABEL[writer as AnalysisWriter] ?? writer;
  }

  protected verdictTone(verdict: string | null): 'success' | 'danger' | 'neutral' {
    if (verdict === null) return 'neutral';
    if (verdict === 'toss') return 'danger';
    return 'success';
  }

  /** The per-email conclusion, in the same grammar as the links tab: what this
   *  message cost and what it produced. */
  protected outcomeLine(e: PollRunEmail): string {
    if (e.links_followed === null && e.analysis_writer === null) {
      return 'Discovered, but never analysed — the deep read did not complete.';
    }
    const parts: string[] = [];
    if (e.links_followed !== null) {
      parts.push(`${e.links_followed} link${e.links_followed === 1 ? '' : 's'} followed`);
    }
    if (e.links_skipped !== null && e.links_skipped > 0) {
      parts.push(`${e.links_skipped} not followed`);
    }
    const work = parts.length > 0 ? parts.join(', ') : 'no link step recorded';
    if (e.vault_note_seq !== null) return `${work} — filed as a vault note.`;
    if (e.verdict === 'toss') return `${work} — tossed by the gate.`;
    if (e.verdict !== null) return `${work} — kept, but never filed.`;
    return `${work} — not yet gated.`;
  }
}
