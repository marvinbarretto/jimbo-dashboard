import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { VaultChip } from '@shared/components/vault-chip/vault-chip';
import { relativeTime } from '@shared/utils/datetime.utils';
import { sharedQueueOwner } from '@domain/pipeline';
import type { QueuedNote, StageQueue } from '../../../pipeline-control/data-access/pipeline-control.service';

/**
 * The head of a stage's queue, in the order the pump will take it.
 *
 * This list comes from the server, sliced off the same candidate array that
 * produces `eligible` — it is not filterable client-side. Restating the
 * admission rules here (actor kind, blocked_on, retry cap, project scope)
 * would name notes the pump will never pick, and a confidently wrong "next up"
 * is worse than none.
 *
 * Age is the point of the display, not decoration: grooming is FIFO, so the
 * top row's age IS the queue's latency. Decompose's head was 28 days old when
 * this was built, because the stage is throttled to 0.
 */
@Component({
  selector: 'app-grooming-next-up',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiEmptyState, VaultChip],
  host: { 'data-testid': 'grooming-next-up' },
  template: `
    <div class="next">
      @for (stage of stages(); track stage.stage) {
        <section class="next__stage" [attr.data-stage]="stage.stage">
          <h3 class="next__head">
            {{ stage.stage }}
            <span class="next__count">
              @if (stage.eligible === 0) {
                nothing eligible
              } @else {
                next {{ stage.next_up.length }} of {{ stage.eligible }}
              }
            </span>
            @if (stage.per_tick <= 0) {
              <span class="next__off" title="Throttled to 0 per tick — this queue is parked, not stuck">
                stage off
              </span>
            }
          </h3>

          @if (stage.next_up.length === 0) {
            <p class="next__empty">
              @if (sharesWith(stage); as owner) {
                <!-- Same pool as the owning stage, so quoting at_status again
                     would restate its backlog as a second one. -->
                Reads the same queue as {{ owner }}; nothing here is admissible to this skill.
              } @else if (stage.at_status > 0) {
                {{ stage.at_status }} at this status, none admissible.
              } @else {
                Queue empty.
              }
            </p>
          } @else {
            <ol class="next__list">
              @for (note of stage.next_up; track note.id) {
                <li class="next__row">
                  <span class="next__pos" aria-hidden="true">{{ $index + 1 }}</span>
                  @if (note.seq; as seq) {
                    <app-vault-chip
                      kind="task"
                      [seq]="seq"
                      [title]="note.title"
                      [href]="'/vault-items?detail=' + seq"
                      size="sm" />
                  } @else {
                    <span class="next__title">{{ note.title }}</span>
                  }
                  <span class="next__age" [title]="note.created_at">{{ age(note) }}</span>
                  <span class="next__owner">{{ note.assigned_to }}</span>
                  @if (note.retry_count > 0) {
                    <span class="next__retry" title="Attempts already burned — at the cap the note leaves the queue for a human">
                      retry {{ note.retry_count }}
                    </span>
                  }
                </li>
              }
            </ol>
          }
        </section>
      } @empty {
        <app-ui-empty-state
          title="No stages reported"
          message="The pipeline queue endpoint returned nothing." />
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .next {
      display: grid;
      gap: 1.1rem;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
    }

    .next__head {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin: 0 0 0.4rem;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text);
    }

    .next__count {
      font-family: var(--font-mono);
      font-size: 0.64rem;
      text-transform: none;
      letter-spacing: 0;
      color: var(--color-text-muted);
    }

    .next__off {
      font-size: 0.6rem;
      text-transform: none;
      letter-spacing: 0;
      color: var(--color-warning);
      border: 1px solid currentColor;
      border-radius: 3px;
      padding: 0 0.3rem;
    }

    .next__empty, .next__list { margin: 0; }
    .next__empty { font-size: 0.7rem; color: var(--color-text-muted); font-style: italic; }

    .next__list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.2rem; }

    .next__row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
      padding: 0.2rem 0;
      border-bottom: 1px solid var(--color-border);
    }

    .next__pos {
      font-family: var(--font-mono);
      font-size: 0.6rem;
      color: var(--color-text-muted);
      min-width: 1.1rem;
      text-align: right;
    }

    .next__title { font-size: 0.72rem; }
    .next__age { font-family: var(--font-mono); font-size: 0.62rem; color: var(--color-text-muted); }
    .next__owner { font-size: 0.62rem; color: var(--color-text-muted); }
    .next__retry { font-size: 0.6rem; color: var(--color-warning); font-family: var(--font-mono); }
  `],
})
export class GroomingNextUp {
  readonly stages = input.required<readonly StageQueue[]>();

  protected age(note: QueuedNote): string {
    return relativeTime(note.created_at);
  }

  /** The earlier stage that owns this one's queue, or null when it owns its
   *  own. intake and deepread both read `ungroomed`. */
  protected sharesWith(stage: StageQueue): string | null {
    return sharedQueueOwner(stage.stage, this.stages());
  }
}
