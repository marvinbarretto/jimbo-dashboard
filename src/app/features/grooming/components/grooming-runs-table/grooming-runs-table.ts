import { ChangeDetectionStrategy, Component, TemplateRef, computed, input, viewChild } from '@angular/core';
import { type CellContext, createColumnHelper, type ColumnDef } from '@tanstack/angular-table';
import { UiDataTable } from '@shared/components/ui-data-table/ui-data-table';
import { VaultChip } from '@shared/components/vault-chip/vault-chip';
import { formatDuration } from '@shared/utils/datetime.utils';
import type { GroomingRun, RunOutcome } from '../../data-access/grooming-report.service';

/**
 * Every grooming pass today: sortable, and each row opens onto the model's full
 * reasoning.
 *
 * A row has to answer two questions — what was attempted, and what came of it —
 * and the dispatch record answers neither. `result_summary` reads
 * "intake-quality: clear, passed", which restates the skill name and says
 * nothing about what was read or what moved. Both columns below come from
 * note_activity, joined in the service:
 *
 *   Read as — the model's own account of the item, BEFORE it judged it
 *             (`intake_rationale.what_is_this`). Not what the stage does in
 *             general, but what it understood THIS note to be. Classify and
 *             decompose record none, so those rows fall back to the note title
 *             and badge it — a title must never read as a model's reading.
 *   Result  — the grooming_status transition the pass actually wrote, its
 *             verdict, and the reassignment intake performs. The board can only
 *             ever show you the destination.
 *
 * When nothing matched, the cell says "no change recorded" — a page that
 * explains what happened must not invent a transition.
 *
 * Sorting matters most on `wait`, which is why this went back to ui-data-table
 * after a stint on the plain-table pattern. On 2026-09-08, three of 45 passes
 * waited ~17 HOURS between enqueue and pickup while the median waited seconds
 * — three orders of magnitude of spread, invisible in a chronological list and
 * one click away when the column sorts. `run` is the duller twin (26–82s), but
 * they fail differently and are worth splitting: a long wait is a queue that
 * is not being served, a long run is a slow skill.
 */
@Component({
  selector: 'app-grooming-runs-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiDataTable, VaultChip],
  host: { 'data-testid': 'grooming-runs-table' },
  template: `
    <ng-template #noteCell let-ctx>
      <!-- The chip is a link and owns its own click. Without stopping
           propagation, opening a note also toggles the row it sits in, leaving
           a stray panel behind every drill-through. -->
      <span (click)="$event.stopPropagation()">
        @if (ctx.row.original.seq; as seq) {
          <app-vault-chip
            kind="task"
            [seq]="seq"
            [title]="ctx.row.original.title"
            [href]="'/vault-items?detail=' + seq"
            size="sm" />
        } @else {
          <span class="runs__muted">{{ ctx.row.original.noteId }}</span>
        }
      </span>
    </ng-template>

    <ng-template #readAsCell let-ctx>
      @if (readAs(ctx.row.original); as read) {
        <span class="runs__read">{{ read.text }}</span>
        @if (read.isFallback) {
          <span class="runs__fallback">title</span>
        }
      } @else {
        <span class="runs__muted">—</span>
      }
    </ng-template>

    <ng-template #resultCell let-ctx>
      @if (ctx.row.original.status === 'failed') {
        <span class="runs__failed">failed</span>
      } @else if (ctx.row.original.outcome; as o) {
        @if (o.toStatus) {
          <span class="runs__move" [class.runs__move--rejected]="o.toStatus === 'intake_rejected'">
            <span class="runs__from">{{ o.fromStatus }}</span>
            <span class="runs__arrow" aria-hidden="true">→</span>
            <span class="runs__to">{{ o.toStatus }}</span>
          </span>
        }
        <span class="runs__detail">{{ verdictLine(o) }}</span>
        @if (o.reassignedTo) {
          <span class="runs__detail runs__detail--move">handed to {{ o.reassignedTo }}</span>
        }
      } @else {
        <span class="runs__muted">no change recorded</span>
      }
    </ng-template>

    <!-- The opened panel. Context is the GroomingRun itself. -->
    <ng-template #rowDetailTpl let-run>
      <div class="runs__panel">
        @if (run.status === 'failed') {
          <section class="runs__field runs__field--error">
            <h4>Failed</h4>
            <p>{{ run.error ?? 'No error message was recorded.' }}</p>
          </section>
        }

        @if (run.outcome; as o) {
          @if (o.readAs) {
            <section class="runs__field">
              <h4>What it read this as</h4>
              <p>{{ o.readAs }}</p>
            </section>
          }
          @if (o.whyVerdict) {
            <section class="runs__field">
              <h4>Why it ruled that way</h4>
              <p>{{ o.whyVerdict }}</p>
            </section>
          }
          @if (o.inferredDone) {
            <section class="runs__field">
              <h4>What “done” looks like</h4>
              <p>{{ o.inferredDone }}</p>
            </section>
          }
          @if (!o.readAs && !o.whyVerdict && !o.inferredDone) {
            <section class="runs__field">
              <h4>No reasoning recorded</h4>
              <p>
                The {{ run.stage }} pass writes a verdict but no rationale — only intake records
                what it made of the item. What this pass changed is in <strong>Result</strong>.
              </p>
            </section>
          }
        } @else if (run.status !== 'failed') {
          <section class="runs__field">
            <h4>No change recorded</h4>
            <p>
              This pass completed, but no matching note_activity row was found — so what it
              changed is not being guessed at here.
            </p>
          </section>
        }

        <dl class="runs__facts">
          <div><dt>Skill</dt><dd>{{ run.skill }}</dd></div>
          <div><dt>Model</dt><dd>{{ modelShort(run.model) }}</dd></div>
          @if (run.outcome?.reassignedTo) {
            <div>
              <dt>Reassigned</dt>
              <dd>{{ run.outcome?.reassignedFrom ?? '—' }} → {{ run.outcome?.reassignedTo }}</dd>
            </div>
          }
          @if (run.retryCount > 0) {
            <div><dt>Retries</dt><dd>{{ run.retryCount }}</dd></div>
          }
          <div><dt>Waited</dt><dd>{{ duration(run.waitSeconds) }}</dd></div>
          <div><dt>Ran for</dt><dd>{{ duration(run.runSeconds) }}</dd></div>
        </dl>
      </div>
    </ng-template>

    <app-ui-data-table
      [data]="rows()"
      [columns]="columns"
      [rowDetail]="rowDetailTpl"
      ariaLabel="Grooming passes"
      emptyTitle="No grooming passes yet today"
      [emptyMessage]="emptyMessage()" />
  `,
  styles: [`
    :host { display: block; }

    .runs__muted { color: var(--color-text-muted); font-style: italic; }
    .runs__failed { color: var(--color-danger); }

    /* Clamped so one verbose reading cannot set the height of every row below
       it. The row opens for the whole thing. */
    .runs__read {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.4;
      font-size: 0.74rem;
    }

    .runs__fallback {
      display: inline-block;
      margin-left: 0.3rem;
      font-size: 0.55rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-text-muted);
      border: 1px solid var(--color-border);
      border-radius: 3px;
      padding: 0 0.22rem;
      vertical-align: 1px;
    }

    .runs__move {
      display: flex;
      align-items: center;
      gap: 0.28rem;
      font-family: var(--font-mono);
      font-size: 0.64rem;
      white-space: nowrap;
    }
    .runs__from, .runs__arrow { color: var(--color-text-muted); }
    .runs__to { color: var(--color-accent); }
    .runs__move--rejected .runs__to { color: var(--color-danger); }

    .runs__detail {
      display: block;
      font-size: 0.68rem;
      color: var(--color-text-soft);
      margin-top: 0.1rem;
    }
    .runs__detail--move { color: var(--color-text-muted); }

    /* ── the opened panel ───────────────────────────────────────────── */

    .runs__panel {
      display: grid;
      gap: 0.85rem;
      padding: 0.3rem 0 0.8rem 1.3rem;
      margin-left: 0.35rem;
      border-left: 2px solid var(--color-accent);
      max-width: 74ch;
    }

    .runs__field h4 {
      margin: 0 0 0.2rem;
      font-size: 0.62rem;
      font-weight: 400;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
    }

    .runs__field p {
      margin: 0;
      font-size: 0.76rem;
      line-height: 1.55;
      color: var(--color-text);
    }

    .runs__field--error p {
      color: var(--color-danger);
      font-family: var(--font-mono);
      font-size: 0.7rem;
    }

    .runs__facts {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1.4rem;
      margin: 0;
      padding-top: 0.35rem;
      border-top: 1px solid var(--color-border);
    }
    .runs__facts div { display: flex; gap: 0.35rem; align-items: baseline; }
    .runs__facts dt {
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-text-muted);
    }
    .runs__facts dd {
      margin: 0;
      font-size: 0.68rem;
      font-family: var(--font-mono);
      color: var(--color-text-soft);
    }
  `],
})
export class GroomingRunsTable {
  readonly runs = input.required<readonly GroomingRun[]>();
  /** Null shows every stage. */
  readonly stageFilter = input<string | null>(null);

  private readonly columnHelper = createColumnHelper<GroomingRun>();

  private readonly noteCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<GroomingRun, unknown> }>>('noteCell');
  private readonly readAsCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<GroomingRun, unknown> }>>('readAsCell');
  private readonly resultCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<GroomingRun, unknown> }>>('resultCell');

  protected readonly rows = computed(() => {
    const stage = this.stageFilter();
    const all = this.runs();
    return stage ? all.filter(r => r.stage === stage) : [...all];
  });

  protected readonly emptyMessage = computed(() =>
    this.stageFilter()
      ? `Nothing has passed through ${this.stageFilter()} today. Clear the stage filter to see the rest.`
      : 'The pump ticks every 30 minutes. Nothing has completed since midnight.',
  );

  // Every column carries an explicit `size`: ui-data-table writes
  // header.getSize() straight into style.width and TanStack defaults to 150px,
  // so leaving them unset gives eight equal columns and squeezes the two that
  // carry the explanation.
  protected readonly columns: ColumnDef<GroomingRun, any>[] = [
    this.columnHelper.accessor(row => row.completedAt ?? '', {
      id: 'when',
      header: 'Finished',
      size: 92,
      cell: ctx => this.timeOfDay(ctx.getValue()),
      sortingFn: 'alphanumeric',
    }),
    this.columnHelper.accessor(row => row.stage, {
      id: 'stage',
      header: 'Stage',
      size: 88,
      sortingFn: 'alphanumeric',
    }),
    this.columnHelper.accessor(row => row.seq ?? 0, {
      id: 'note',
      header: 'Note',
      size: 210,
      cell: () => this.noteCell(),
    }),
    this.columnHelper.accessor(row => this.readAs(row)?.text ?? '', {
      id: 'readAs',
      header: 'Read as',
      size: 400,
      cell: () => this.readAsCell(),
    }),
    this.columnHelper.accessor(row => row.outcome?.toStatus ?? '', {
      id: 'result',
      header: 'Result',
      size: 210,
      cell: () => this.resultCell(),
    }),
    // Sorts on the raw seconds, not the rendered "~17h" — a lexical sort would
    // put ~2s after ~17h and quietly hide the outlier this column exists for.
    this.columnHelper.accessor(row => row.waitSeconds ?? -1, {
      id: 'wait',
      header: 'Wait',
      size: 70,
      cell: ctx => this.duration(ctx.row.original.waitSeconds),
    }),
    this.columnHelper.accessor(row => row.runSeconds ?? -1, {
      id: 'run',
      header: 'Run',
      size: 70,
      cell: ctx => this.duration(ctx.row.original.runSeconds),
    }),
    this.columnHelper.accessor(row => row.executor ?? '', {
      id: 'executor',
      header: 'By',
      size: 80,
      sortingFn: 'alphanumeric',
    }),
  ];

  /** What the pass understood the item to be. Only intake records one, so the
   *  other stages fall back to the note's title — flagged, so a reader never
   *  mistakes a title for the model's reading. */
  protected readAs(run: GroomingRun): { text: string; isFallback: boolean } | null {
    const read = run.outcome?.readAs;
    if (read) return { text: read, isFallback: false };
    if (run.title) return { text: run.title, isFallback: true };
    return null;
  }

  protected verdictLine(o: RunOutcome): string {
    // Confidence as a percentage: "@ 0.65" is the raw field, not a reading.
    if (o.aiPriority !== null) {
      const conf = o.priorityConfidence !== null
        ? ` · ${Math.round(o.priorityConfidence * 100)}% confident`
        : '';
      return `P${o.aiPriority}${conf}`;
    }
    if (o.subtaskCount !== null) {
      return o.subtaskCount === 0
        ? 'no subtasks needed'
        : `${o.subtaskCount} subtask${o.subtaskCount === 1 ? '' : 's'}`;
    }
    return o.verdict ?? '';
  }

  /** Everything here is from today, so the date would be noise on every row. */
  protected timeOfDay(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? '—'
      : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  protected duration(seconds: number | null): string {
    return seconds == null ? '—' : formatDuration(seconds);
  }

  protected modelShort(model: string | null): string {
    if (!model) return 'not recorded';
    return (model.split('/').at(-1) ?? model).replace(/^claude-/, '').replace(/-\d{8}$/, '');
  }
}
