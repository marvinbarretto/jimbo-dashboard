import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { UiButtonLink } from '@shared/components/ui-button-link/ui-button-link';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiRefreshControl } from '@shared/components/ui-refresh-control/ui-refresh-control';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { withVaultDetailModal } from '@shared/kanban/detail-modal';
import { FleetService } from '../../../fleet/data-access/fleet.service';
import { GroomingFunnel } from '../../components/grooming-funnel/grooming-funnel';
import { GroomingNextUp } from '../../components/grooming-next-up/grooming-next-up';
import { GroomingRunsTable } from '../../components/grooming-runs-table/grooming-runs-table';
import { SKILL_STAGE } from '@domain/pipeline';
import { GroomingReportService } from '../../data-access/grooming-report.service';

/**
 * Grooming as flow, which the kanban cannot show.
 *
 * A board has no time axis: a note that cleared intake an hour ago and one
 * that cleared it a month ago sit in the same column. This page has four
 * blocks answering the four questions the board leaves open — what is running,
 * where the work is piling up, what each pass decided today, and what the pump
 * takes next.
 *
 * Selecting a funnel stage filters the runs table. One selection, shared, so
 * the funnel row and the table below it always describe the same stage.
 */
@Component({
  selector: 'app-grooming-report-page',
  imports: [
    UiButtonLink, UiPage, UiPageHeader, UiRefreshControl, UiSection, UiStack,
    GroomingFunnel, GroomingNextUp, GroomingRunsTable,
  ],
  templateUrl: './grooming-report-page.html',
  styleUrl: './grooming-report-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-testid': 'grooming-report-page' },
})
export class GroomingReportPage {
  private readonly report = inject(GroomingReportService);
  private readonly fleet = inject(FleetService);

  constructor() {
    // Every note on this page is a vault-chip, and a chip's plain click pushes
    // `?detail=<seq>` expecting the host page to own a modal. Without this the
    // chips are inert on left-click — which on a page built for clicking
    // through to the note is the whole affordance gone. It resolves the item by
    // seq, so it works here despite this page never loading the vault list.
    withVaultDetailModal();

    // Both services own their own polling + DestroyRef teardown, registered via
    // inject(DestroyRef) — which needs an injection context, so start() is
    // called here rather than from ngOnInit. Same as FleetBoard.
    //
    // NB this page logs NG0103 ("could not stabilize") intermittently on a cold
    // load in dev. It is not from this page: /fleet does the same, the page
    // renders and polls correctly, and deferring these start() calls to
    // afterNextRender did not stop it. Dev-only diagnostic; needs its own pass
    // across the shared polling + ui-data-table stack.
    this.report.start();
    this.fleet.start();
  }

  protected readonly stages = this.report.stages;
  protected readonly runs = this.report.runs;
  protected readonly truncated = this.report.truncated;
  protected readonly runsByStage = this.report.runsByStage;
  protected readonly loading = this.report.loading;
  protected readonly error = this.report.error;
  protected readonly lastFetch = this.report.lastFetch;
  protected readonly ticksPerDay = this.report.ticksPerDay;

  protected readonly selectedStage = signal<string | null>(null);

  /**
   * Grooming work in flight right now, from the fleet poller. A run takes
   * ~40–60s, so this is the only block on the page that is genuinely live —
   * everything else moves when a tick fires, every 30 minutes.
   */
  protected readonly runningNow = computed(() =>
    this.fleet.now()
      .filter(d => d.flow === 'groom')
      .map(d => ({
        id: d.id,
        stage: SKILL_STAGE[d.skill ?? ''] ?? d.skill ?? 'grooming',
        executor: d.executor,
        // The running feed carries no seq, so there is no vault-chip here —
        // the title (or the note id) is all the API gives us mid-flight.
        title: d.note_title ?? d.task_id,
        startedAt: d.started_at,
      })),
  );

  protected readonly headerHint = computed(() => {
    const n = this.runs().length;
    const failed = this.report.failedToday();
    const ticks = this.ticksPerDay();
    const parts = [`${n} pass${n === 1 ? '' : 'es'} today`];
    if (failed > 0) parts.push(`${failed} failed`);
    if (ticks) parts.push(`pump ticks ${ticks}×/day`);
    return parts.join(' · ');
  });

  protected readonly runsCaption = computed(() => {
    const stage = this.selectedStage();
    const shown = stage
      ? this.runs().filter(r => r.stage === stage).length
      : this.runs().length;
    const scope = stage ? `${stage} only` : 'all stages';
    // Only claim completeness we have. The API page size is 100 and the page
    // never asks for a second page, so a full page means there may be more.
    return this.truncated()
      ? `${shown} shown · ${scope} · more than 100 passes today, showing the latest`
      : `${shown} shown · ${scope} · since midnight`;
  });

  protected onStagePicked(stage: string | null): void {
    this.selectedStage.set(stage);
  }

  protected refresh(): void {
    void this.report.refresh();
    void this.fleet.refresh();
  }
}
