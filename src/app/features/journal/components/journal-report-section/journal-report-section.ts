import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { environment } from '../../../../../environments/environment';
import type {
  DayReport,
  ReportArc,
  ReportCarriedDebt,
  ReportFleet,
  ReportProject,
} from '@domain/day-report/day-report';

/**
 * The day's published report.
 *
 * Everything else on this page is a reconstruction the reader has to assemble:
 * a timeline of spans, a grid of counts, a list of sessions. This is the one
 * section that has already done that work — prose written overnight by a job
 * that never asks Marvin anything, sitting above the evidence it was drawn
 * from.
 *
 * Read-only by construction. There is no authored text in this domain, so
 * unlike the checks section beside it there is nothing here to submit.
 */
@Component({
  selector: 'app-journal-report-section',
  imports: [UiEmptyState, UiLoadingState, UiProse, UiSection, UiStack, UiStatCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-report-section.html',
  styleUrl: './journal-report-section.scss',
})
export class JournalReportSection {
  /** Logical day key (YYYY-MM-DD). */
  readonly date = input.required<string>();

  private readonly resource = httpResource<DayReport>(() =>
    `${environment.dashboardApiUrl}/api/day-reports/${this.date()}`);

  protected readonly loading = computed(() => this.resource.isLoading());

  protected readonly report = computed(() =>
    this.resource.hasValue() ? this.resource.value() : null);

  /**
   * A 404 means the writer has not published this day — which is a different
   * fact from the writer having failed, and the section says so rather than
   * showing one blank state for both. A quiet day still gets a report; a
   * missing report means the job did not run.
   */
  protected readonly unpublished = computed(() => {
    const err = this.resource.error() as { status?: number } | undefined;
    return err?.status === 404;
  });

  protected readonly failed = computed(() => {
    const err = this.resource.error() as { status?: number } | undefined;
    return !!err && err.status !== 404;
  });

  protected readonly payload = computed(() => this.report()?.payload ?? null);
  protected readonly arcs = computed<ReportArc[]>(() => this.payload()?.arcs ?? []);
  protected readonly fleet = computed<ReportFleet | null>(() => this.payload()?.fleet ?? null);
  protected readonly carriedDebt = computed<ReportCarriedDebt[]>(() => this.payload()?.carried_debt ?? []);

  /** Projects that moved, busiest first — the quiet ones go in their own list. */
  protected readonly movedProjects = computed<ReportProject[]>(() =>
    (this.payload()?.projects ?? [])
      .filter(p => p.days_since_touched === null)
      .sort((a, b) => (b.commits + b.sessions) - (a.commits + a.sessions)));

  /**
   * Projects that did not move, longest-quiet first. Shown because a report
   * that only lists what moved makes 18 projects look like 3, and the drift is
   * the part worth noticing.
   */
  protected readonly quietProjects = computed<ReportProject[]>(() =>
    (this.payload()?.projects ?? [])
      .filter(p => p.days_since_touched !== null)
      .sort((a, b) => (b.days_since_touched ?? 0) - (a.days_since_touched ?? 0)));

  protected readonly counts = computed(() => this.payload()?.counts ?? null);

  /** Provenance line: which job, which model, when. First thing to check when a report reads badly. */
  protected readonly provenance = computed(() => {
    const r = this.report();
    if (!r) return null;
    const at = new Date(r.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return r.model ? `${r.generator} · ${r.model} · ${at}` : `${r.generator} · ${at}`;
  });

  protected readonly hasBody = computed(() => {
    const p = this.payload();
    if (!p) return false;
    return !!(p.narrative || p.headline || this.arcs().length || this.fleet() || this.movedProjects().length);
  });

  protected time(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  protected cost(usd: number | null | undefined): string {
    // Null is flat-billed, not free — saying "$0.00" would quietly claim the
    // day's Boris work cost nothing, which is the opposite of the truth.
    if (usd === null || usd === undefined) return 'flat';
    return usd === 0 ? '—' : `$${usd.toFixed(2)}`;
  }
}
