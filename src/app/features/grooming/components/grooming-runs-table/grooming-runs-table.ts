import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TableShell } from '@shared/components/table-shell/table-shell';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { VaultChip } from '@shared/components/vault-chip/vault-chip';
import { formatDuration } from '@shared/utils/datetime.utils';
import type { GroomingRun, RunOutcome } from '../../data-access/grooming-report.service';

/**
 * Every grooming pass today, newest first, each row opening onto the model's
 * full reasoning.
 *
 * A row has to answer two questions: what was attempted, and what came of it.
 * The dispatch record alone answers neither — `result_summary` reads
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
 * Expansion follows the ui-lab "Expandable Rows Inline" pattern (TableShell,
 * whole row as the trigger, one open at a time). The rationale runs to a
 * paragraph per field: more than a cell can hold, and more than a tooltip
 * should ask anyone to read while holding a mouse still. The cost is the column
 * sorting the TanStack version had — the table is chronological, and the funnel
 * above filters it by stage.
 *
 * `wait` is enqueue→pickup and `run` is pickup→finish. Split because they fail
 * differently: a long wait is a saturated groomer, a long run is a slow skill.
 */
@Component({
  selector: 'app-grooming-runs-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableShell, UiEmptyState, VaultChip],
  host: { 'data-testid': 'grooming-runs-table' },
  template: `
    @if (rows().length === 0) {
      <app-ui-empty-state title="No grooming passes yet today" [message]="emptyMessage()" />
    } @else {
      <app-table-shell>
        <table class="runs" aria-label="Grooming passes">
          <thead>
            <tr>
              <th scope="col" class="runs__c-when">Finished</th>
              <th scope="col" class="runs__c-stage">Stage</th>
              <th scope="col" class="runs__c-note">Note</th>
              <th scope="col" class="runs__c-read">Read as</th>
              <th scope="col" class="runs__c-result">Result</th>
              <th scope="col" class="runs__c-num">Wait</th>
              <th scope="col" class="runs__c-num">Run</th>
              <th scope="col" class="runs__c-by">By</th>
            </tr>
          </thead>
          <tbody>
            @for (run of rows(); track run.id) {
              <tr
                class="runs__row"
                [class.runs__row--open]="expandedId() === run.id"
                tabindex="0"
                role="button"
                [attr.aria-expanded]="expandedId() === run.id"
                data-testid="runs-row"
                [attr.data-stage]="run.stage"
                (click)="toggle(run.id)"
                (keydown.enter)="toggle(run.id)"
                (keydown.space)="toggle(run.id); $event.preventDefault()">
                <td class="runs__c-when">
                  <span class="runs__caret" aria-hidden="true">{{ expandedId() === run.id ? '▾' : '▸' }}</span>
                  {{ timeOfDay(run.completedAt) }}
                </td>
                <td class="runs__c-stage">{{ run.stage }}</td>

                <!-- The chip is a link and owns its own click. Without stopping
                     propagation, opening a note would also toggle the row it
                     sits in, leaving a stray panel behind every drill-through. -->
                <td class="runs__c-note" (click)="$event.stopPropagation()">
                  @if (run.seq; as seq) {
                    <app-vault-chip
                      kind="task"
                      [seq]="seq"
                      [title]="run.title"
                      [href]="'/vault-items?detail=' + seq"
                      size="sm" />
                  } @else {
                    <span class="runs__muted">{{ run.noteId }}</span>
                  }
                </td>

                <td class="runs__c-read">
                  @if (readAs(run); as read) {
                    <span class="runs__read">{{ read.text }}</span>
                    @if (read.isFallback) {
                      <span class="runs__fallback">title</span>
                    }
                  } @else {
                    <span class="runs__muted">—</span>
                  }
                </td>

                <td class="runs__c-result">
                  @if (run.status === 'failed') {
                    <span class="runs__failed">failed</span>
                  } @else if (run.outcome; as o) {
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
                </td>

                <td class="runs__c-num">{{ duration(run.waitSeconds) }}</td>
                <td class="runs__c-num">{{ duration(run.runSeconds) }}</td>
                <td class="runs__c-by">{{ run.executor }}</td>
              </tr>

              @if (expandedId() === run.id) {
                <tr class="runs__expanded">
                  <td colspan="8">
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
                              The {{ run.stage }} pass writes a verdict but no rationale — only
                              intake records what it made of the item. What this pass changed is
                              in <strong>Result</strong>.
                            </p>
                          </section>
                        }
                      } @else if (run.status !== 'failed') {
                        <section class="runs__field">
                          <h4>No change recorded</h4>
                          <p>
                            This pass completed, but no matching note_activity row was found — so
                            what it changed is not being guessed at here.
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
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </app-table-shell>
    }
  `,
  styles: [`
    :host { display: block; }

    .runs {
      width: 100%;
      min-width: 60rem;
      border-collapse: collapse;
      font-size: 0.74rem;
    }

    .runs th, .runs td {
      padding: 0.45rem 0.6rem;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid var(--color-border);
    }

    .runs thead th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--color-surface-soft);
      font-weight: 400;
      font-size: 0.62rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      white-space: nowrap;
    }

    .runs__row { cursor: pointer; }
    .runs__row:hover { background: color-mix(in srgb, var(--color-accent) 5%, transparent); }
    .runs__row:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }
    .runs__row--open { background: color-mix(in srgb, var(--color-accent) 8%, transparent); }
    .runs__row--open td { border-bottom-color: transparent; }

    .runs__caret {
      display: inline-block;
      width: 0.7rem;
      color: var(--color-text-muted);
      font-size: 0.6rem;
    }

    .runs__c-when   { width: 6.5rem; white-space: nowrap; font-family: var(--font-mono); }
    .runs__c-stage  { width: 6rem; white-space: nowrap; }
    .runs__c-note   { width: 15rem; }
    .runs__c-read   { width: 26rem; }
    .runs__c-result { width: 14rem; }
    .runs__c-num    { width: 4rem; text-align: right; white-space: nowrap; font-family: var(--font-mono); }
    .runs__c-by     { width: 5rem; white-space: nowrap; }

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

    .runs__expanded td {
      background: color-mix(in srgb, var(--color-surface-soft) 92%, var(--color-bg));
      padding-top: 0;
    }

    .runs__panel {
      display: grid;
      gap: 0.85rem;
      padding: 0.3rem 0 0.7rem 1.3rem;
      margin-left: 0.35rem;
      border-left: 2px solid var(--color-accent);
      max-width: 68ch;
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

  /** One open at a time — the panel runs to several paragraphs, and a handful
   *  open at once turns the table back into the wall of text it replaced.
   *  Matches the ui-lab "Expandable Rows Inline" pattern. */
  protected readonly expandedId = signal<string | null>(null);

  protected readonly rows = computed(() => {
    const stage = this.stageFilter();
    const all = this.runs();
    return stage ? all.filter(r => r.stage === stage) : all;
  });

  protected readonly emptyMessage = computed(() =>
    this.stageFilter()
      ? `Nothing has passed through ${this.stageFilter()} today. Clear the stage filter to see the rest.`
      : 'The pump ticks every 30 minutes. Nothing has completed since midnight.',
  );

  protected toggle(id: string): void {
    this.expandedId.update(current => (current === id ? null : id));
  }

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
  protected timeOfDay(iso: string | null): string {
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
