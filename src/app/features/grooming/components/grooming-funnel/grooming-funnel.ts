import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { sharedQueueOwner } from '@domain/pipeline';
import type { StageQueue } from '../../../pipeline-control/data-access/pipeline-control.service';

/**
 * The pump's four stages as a funnel, one row each.
 *
 * Three rules this component exists to enforce, all of them learned:
 *
 *   1. `per_tick: 0` renders as OFF, never as "cleared 0". A gated stage's
 *      zero is intent; rendering it identically to a failure is the exact
 *      confusion the 2026-09-04 fleet spec was written to stop.
 *   2. `at_status` and `eligible` are always shown together, with the gap
 *      between them named. A stage admitting 278 of 1,582 looks like a healthy
 *      queue if you only ever show one number — and the 1,304 it cannot admit
 *      is the largest single constraint on grooming throughput.
 *   3. No drain estimate. The old one was eligible / per_day, which assumes
 *      nothing new arrives; on 2026-09-07 intake cleared 44 in ten days while
 *      decompose created 275. Arrived / cleared / net, and stop.
 *   4. Stages sharing a grooming_status share a QUEUE. intake and deepread both
 *      read `ungroomed`, so the API returns the same at_status on both — and a
 *      column repeating 1,581 twice reads as 3,162 waiting notes to anyone who
 *      adds it up. The second row defers instead of restating.
 */
@Component({
  selector: 'app-grooming-funnel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiBadge],
  host: { 'data-testid': 'grooming-funnel' },
  template: `
    <div class="funnel__scroll">
      <table class="funnel" aria-label="Grooming stages">
        <thead>
          <tr>
            <th scope="col" class="funnel__stage-col">Stage</th>
            <th scope="col" class="funnel__num">At status</th>
            <th scope="col" class="funnel__num">Eligible</th>
            <th scope="col" class="funnel__num">Can't enter</th>
            <th scope="col" class="funnel__num">Per tick</th>
            <th scope="col" class="funnel__num">Arrived 7d</th>
            <th scope="col" class="funnel__num">Cleared 7d</th>
            <th scope="col" class="funnel__num">Net 7d</th>
            <th scope="col" class="funnel__num">Today</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.stage) {
            <tr
              class="funnel__row"
              [class.funnel__row--off]="row.off"
              [class.funnel__row--shared]="row.sharesWith"
              [class.funnel__row--selected]="row.stage === selected()"
              data-testid="funnel-row"
              [attr.data-stage]="row.stage">
              <th scope="row" class="funnel__stage-col">
                <button
                  type="button"
                  class="funnel__pick"
                  [attr.aria-pressed]="row.stage === selected()"
                  (click)="stagePicked.emit(row.stage === selected() ? null : row.stage)">
                  <span class="funnel__ord" aria-hidden="true">{{ $index + 1 }}</span>
                  {{ row.stage }}
                </button>
                @if (row.off) {
                  <app-ui-badge tone="neutral">off</app-ui-badge>
                }
              </th>

              <!-- Queue-wide figures. A stage sharing another's grooming_status
                   defers rather than repeating them — the numbers would be
                   identical and inviting the reader to add them up. -->
              @if (row.sharesWith; as owner) {
                <td class="funnel__num funnel__shared" colspan="2" [title]="sharedHint(owner)">
                  same queue as {{ owner }}
                </td>
                <td class="funnel__num funnel__shared" [title]="sharedHint(owner)">↑</td>
              } @else {
                <td class="funnel__num">{{ row.at_status }}</td>
                <td class="funnel__num funnel__num--strong">{{ row.eligible }}</td>
                <td
                  class="funnel__num funnel__num--muted"
                  [title]="blockedHint">{{ row.blocked }}</td>
              }

              <td class="funnel__num">
                @if (row.off) { <span class="funnel__off">off</span> } @else { {{ row.per_tick }} }
              </td>

              @if (row.sharesWith) {
                <td class="funnel__num funnel__shared">↑</td>
              } @else {
                <td class="funnel__num">{{ row.arrived_7d }}</td>
              }

              <td class="funnel__num">
                @if (row.off) { <span class="funnel__off">—</span> } @else { {{ row.cleared_7d }} }
              </td>

              <!-- Net is arrivals minus clearances, so a stage that cannot clear
                   anything has no net to report. Rendering deepread's +337 made
                   a switched-off stage look like a runaway backlog of its own. -->
              <td
                class="funnel__num"
                [class.funnel__num--growing]="!row.off && row.net > 0"
                [class.funnel__num--draining]="!row.off && row.net < 0">
                @if (row.off) {
                  <span class="funnel__off">—</span>
                } @else {
                  {{ row.net > 0 ? '+' : '' }}{{ row.net }}
                }
              </td>

              <td class="funnel__num">{{ row.today }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <p class="funnel__note">
      A stage marked <strong>off</strong> is throttled to 0 per tick — its queue is parked by
      configuration, not stuck, and it reports no clearances or net because it cannot clear
      anything. <strong>Net 7d</strong> is arrivals minus clearances: positive means the queue
      grew. There is deliberately no drain estimate; one that assumed no new arrivals was wrong
      by a factor of six. Rows reading <em>same queue as…</em> are a second skill over the same
      pool of notes, not a second backlog — don't add the column up.
    </p>
  `,
  styles: [`
    :host { display: block; }

    .funnel__scroll { overflow-x: auto; }

    .funnel {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
    }

    .funnel th, .funnel td {
      padding: 0.4rem 0.6rem;
      border-bottom: 1px solid var(--color-border);
      text-align: left;
      font-weight: 400;
    }

    .funnel thead th {
      font-size: 0.62rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      white-space: nowrap;
    }

    .funnel__num { text-align: right; font-family: var(--font-mono); white-space: nowrap; }
    .funnel__num--strong { font-weight: 600; color: var(--color-text); }
    .funnel__num--muted { color: var(--color-text-muted); }
    .funnel__num--growing { color: var(--color-warning); }
    .funnel__num--draining { color: var(--color-success); }

    .funnel__stage-col { min-width: 9rem; }

    .funnel__row--off td, .funnel__row--off .funnel__pick { opacity: 0.62; }
    .funnel__row--selected { background: var(--color-surface-soft); }

    .funnel__pick {
      background: transparent;
      border: 0;
      padding: 0;
      font: inherit;
      color: var(--color-text);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .funnel__pick:hover { color: var(--color-accent); }
    .funnel__pick[aria-pressed="true"] { font-weight: 600; color: var(--color-accent); }

    .funnel__ord {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.15rem;
      height: 1.15rem;
      border-radius: 50%;
      border: 1px solid var(--color-border);
      font-size: 0.6rem;
      font-family: var(--font-mono);
      color: var(--color-text-muted);
    }

    .funnel__off { color: var(--color-text-muted); font-style: italic; }

    .funnel__shared {
      color: var(--color-text-muted);
      font-style: italic;
      font-family: inherit;
      font-size: 0.68rem;
    }

    .funnel__row--shared td { opacity: 0.85; }

    .funnel__note {
      margin: 0.6rem 0 0;
      font-size: 0.68rem;
      color: var(--color-text-muted);
      line-height: 1.5;
    }
  `],
})
export class GroomingFunnel {
  readonly stages = input.required<readonly StageQueue[]>();
  /** Completed/failed passes today, per stage. */
  readonly runsToday = input<ReadonlyMap<string, number>>(new Map());
  readonly selected = input<string | null>(null);

  readonly stagePicked = output<string | null>();

  protected readonly blockedHint =
    'At this stage but not admissible: unrouted, assigned to a human, blocked on an answer, or past the retry cap.';

  protected sharedHint(owner: string): string {
    return `Reads the same grooming_status as ${owner} — one pool of notes, two skills over it. `
      + 'Its depth is that row\'s number, not an additional backlog.';
  }

  protected readonly rows = computed(() => {
    // First row to claim a grooming_status owns its depth figures; later rows on
    // the same status defer to it. Order matters, and the service hands stages
    // over in pipeline order.
    const all = this.stages();
    return all.map(s => {
      const owner = sharedQueueOwner(s.stage, all);
      return {
        ...s,
        off: s.per_tick <= 0,
        blocked: Math.max(0, s.at_status - s.eligible),
        net: s.arrived_7d - s.cleared_7d,
        today: this.runsToday().get(s.stage) ?? 0,
        /** Null when this row owns its own queue. */
        sharesWith: owner,
      };
    });
  });
}
