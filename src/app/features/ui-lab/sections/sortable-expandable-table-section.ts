import { ChangeDetectionStrategy, Component, TemplateRef, viewChild } from '@angular/core';
import { type CellContext, createColumnHelper, type ColumnDef } from '@tanstack/angular-table';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiDataTable } from '@shared/components/ui-data-table/ui-data-table';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

interface LabPassRow {
  readonly id: string;
  readonly finished: string;
  readonly stage: string;
  readonly verdict: string;
  /** Seconds. Sorting on the raw number is the whole point — see below. */
  readonly waitSeconds: number;
  readonly readAs: string;
  readonly why: string;
}

/**
 * The sortable + expandable table.
 *
 * WHICH PATTERN DO I REACH FOR?
 *
 *   "Expandable Rows Inline" (the other section) — TableShell plus a plain
 *   <table> you lay out by hand. Right for a small, fixed set where you control
 *   every cell and nobody will want to reorder it: a handful of rows, bespoke
 *   markup, no sorting.
 *
 *   THIS one — ui-data-table with `rowDetail`. Right as soon as the set is big
 *   enough or varied enough that someone will want to reorder it. Sorting is
 *   not decoration: on the grooming report, three of 45 passes had waited ~17
 *   HOURS while the median waited seconds. In a chronological list that is
 *   invisible; sorted by wait it is the top row. Any column whose values span
 *   orders of magnitude is an argument for this pattern.
 *
 * The two used to be mutually exclusive — ui-data-table could sort but not
 * expand, so a table wanting both had to give one up. `rowDetail` is opt-in and
 * additive: tables that pass nothing behave exactly as before, with no cursor,
 * no tabindex and no role on the row.
 *
 * Gotchas worth knowing:
 *
 *   - Sort on the RAW value, render the friendly one. `accessor(row =>
 *     row.waitSeconds)` with `cell: ctx => format(...)`. Sorting the rendered
 *     string puts "~2s" after "~17h" and hides the very outlier you added the
 *     column for.
 *   - Interactive cells must stop propagation, or clicking a link inside a row
 *     also toggles the row.
 *   - Set an explicit `size` on every column. ui-data-table writes
 *     `header.getSize()` into `style.width` and TanStack's default is 150px, so
 *     unsized columns come out uniformly wide.
 *   - Expansion is an accordion by default. Pass `[multiExpand]="true"` for
 *     compare-two-rows cases; the default suits panels of a paragraph or more.
 */
@Component({
  selector: 'app-sortable-expandable-table-section',
  imports: [UiBadge, UiDataTable, UiPageHeader, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Sortable + Expandable Table" [collapsible]="false">
      <app-ui-stack gap="lg">
        <app-ui-page-header>
          <h2 uiPageHeaderTitle>Sortable + Expandable Table</h2>
          <p uiPageHeaderHint>
            <code>ui-data-table</code> with a <code>rowDetail</code> template. Sort any column;
            click any row to open its panel. Use this when the set is big enough that someone
            will want to reorder it — otherwise the plain-table “Expandable Rows Inline” pattern
            is lighter.
          </p>
        </app-ui-page-header>

        <p class="ui-lab__support-copy">
          Sort by <strong>Wait</strong>: the 17-hour outlier jumps to the top. That is the case
          this pattern exists for — a column whose values span orders of magnitude is invisible
          in a chronological list.
        </p>

        <ng-template #verdictCell let-ctx>
          <app-ui-badge [tone]="ctx.row.original.stage === 'intake' ? 'info' : 'neutral'">
            {{ ctx.row.original.verdict }}
          </app-ui-badge>
        </ng-template>

        <ng-template #rowDetailTpl let-row>
          <div class="ui-lab__detail-panel">
            <h4>What it read this as</h4>
            <p class="ui-lab__support-copy">{{ row.readAs }}</p>
            <h4>Why it ruled that way</h4>
            <p class="ui-lab__support-copy">{{ row.why }}</p>
          </div>
        </ng-template>

        <app-ui-data-table
          [data]="samplePasses"
          [columns]="columns"
          [rowDetail]="rowDetailTpl"
          ariaLabel="Sample passes" />
      </app-ui-stack>
    </app-ui-section>
  `,
  styles: [`
    .ui-lab__detail-panel {
      display: grid;
      gap: 0.5rem;
      padding: 0.4rem 0 0.8rem 1.2rem;
      border-left: 2px solid var(--color-accent);
      max-width: 70ch;
    }
    .ui-lab__detail-panel h4 {
      margin: 0;
      font-size: 0.62rem;
      font-weight: 400;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
    }
    .ui-lab__detail-panel p { margin: 0; }
  `],
})
export class SortableExpandableTableSection {
  private readonly columnHelper = createColumnHelper<LabPassRow>();

  private readonly verdictCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<LabPassRow, unknown> }>>('verdictCell');

  protected readonly samplePasses: readonly LabPassRow[] = [
    {
      id: 'pass-001', finished: '20:30', stage: 'intake', verdict: 'clear', waitSeconds: 182,
      readAs: 'Operator wants to integrate the contradiction generator into the fixture suite and verify it end to end.',
      why: 'Single well-scoped integration task with explicit acceptance criteria — an agent can execute it against a defined success bar.',
    },
    {
      id: 'pass-002', finished: '19:57', stage: 'classify', verdict: 'P2 · 80%', waitSeconds: 3,
      readAs: 'Both generators pass interrogate schema validation',
      why: 'No rationale recorded — only intake reports what it made of the item.',
    },
    {
      id: 'pass-003', finished: '08:14', stage: 'intake', verdict: 'clear', waitSeconds: 62073,
      readAs: 'Operator wants the reminder send path bounded before it goes live for spoonscount.',
      why: 'Sat approved for seventeen hours before a worker picked it up — the queue was not being served, which no other column shows.',
    },
    {
      id: 'pass-004', finished: '07:02', stage: 'classify', verdict: 'P1 · 75%', waitSeconds: 41,
      readAs: 'Generators compose correctly with existing time-series fixtures',
      why: 'No rationale recorded — only intake reports what it made of the item.',
    },
  ];

  protected readonly columns: ColumnDef<LabPassRow, any>[] = [
    this.columnHelper.accessor(row => row.finished, {
      id: 'finished', header: 'Finished', size: 100, sortingFn: 'alphanumeric',
    }),
    this.columnHelper.accessor(row => row.stage, {
      id: 'stage', header: 'Stage', size: 110, sortingFn: 'alphanumeric',
    }),
    this.columnHelper.accessor(row => row.readAs, {
      id: 'readAs', header: 'Read as', size: 400,
    }),
    this.columnHelper.accessor(row => row.verdict, {
      id: 'verdict', header: 'Verdict', size: 130, cell: () => this.verdictCell(),
    }),
    // Sorts on seconds, renders "~17h". Sorting the rendered string would put
    // "~3s" after "~17h" — the outlier would sink and the column would lie.
    this.columnHelper.accessor(row => row.waitSeconds, {
      id: 'wait', header: 'Wait', size: 90,
      cell: ctx => formatWait(ctx.getValue()),
    }),
  ];
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`;
  if (seconds < 3600) return `~${Math.round(seconds / 60)}m`;
  return `~${Math.round(seconds / 3600)}h`;
}
