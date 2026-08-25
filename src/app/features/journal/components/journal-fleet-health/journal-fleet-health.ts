import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import type { FleetQueueDepth, FleetRunning, FleetWorker } from '@domain/dispatch';
import type { Signal as DayStreamSignal } from '@domain/day-stream/day-stream';
import { healthAlerts, healthHeadline, workerRows } from '../../utils/fleet-health';

/**
 * Is the fleet actually working, and if not, what stopped?
 *
 * Every other section on this page is retrospective — what ran, what it cost,
 * how it was rated. None of them can answer the question that matters most,
 * because **the fleet's failure mode is silence.** A worker that stops picking
 * up jobs produces no errors, no failed runs and no notifications; it produces
 * a quiet night that looks exactly like a quiet night.
 *
 * That is not hypothetical. On 25 Aug 2026 Boris sat with 21 jobs queued and 6
 * hung — one held a slot since 30 July — and nothing anywhere said so.
 *
 * So every row here states an **expectation** alongside the reading. "Last seen
 * 20 minutes ago" is not information; "last seen 20 minutes ago, expected every
 * 15" is. A panel that only reports values can be healthy-looking and wrong.
 */
@Component({
  selector: 'app-journal-fleet-health',
  imports: [UiEmptyState, UiSection, UiStack, UiSubhead],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-section title="Fleet health" [meta]="headline()" [expanded]="true">
      <app-ui-stack gap="md">
        @if (alerts().length > 0) {
          <app-ui-subhead label="Needs attention" [count]="alerts().length" />
          <ul class="health__list">
            @for (row of alerts(); track row.id) {
              <li class="health__row" [attr.data-tone]="row.tone">
                <span class="health__dot" aria-hidden="true"></span>
                <span class="health__body">
                  <span class="health__label">{{ row.label }}</span>
                  <span class="health__detail">{{ row.detail }}</span>
                </span>
                <span class="health__expect">{{ row.expectation }}</span>
              </li>
            }
          </ul>
        } @else {
          <app-ui-empty-state
            title="Nothing overdue"
            message="Every worker has checked in, no job is hung, and no feed has gone quiet." />
        }

        <app-ui-subhead label="Workers" [count]="workers().length" />
        @if (workers().length === 0) {
          <app-ui-empty-state message="No worker has ever checked in." />
        } @else {
          <ul class="health__list">
            @for (row of workerRows(); track row.id) {
              <li class="health__row" [attr.data-tone]="row.tone">
                <span class="health__dot" aria-hidden="true"></span>
                <span class="health__body">
                  <span class="health__label">{{ row.label }}</span>
                  <span class="health__detail">{{ row.detail }}</span>
                </span>
                <span class="health__expect">{{ row.expectation }}</span>
              </li>
            }
          </ul>
        }
      </app-ui-stack>
    </app-ui-section>
  `,
  styles: [`
    .health__list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .health__row {
      display: grid;
      grid-template-columns: 0.55rem 1fr auto;
      align-items: baseline;
      gap: 0.6rem;
      padding: 0.4rem 0;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.78rem;
    }

    .health__row:last-child { border-bottom: 0; }

    .health__dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 999px;
      background: var(--color-text-muted);
      align-self: center;
    }

    // Tone is on the row so the dot, not the text, carries the signal — a
    // column of red sentences is harder to scan than a column of dots.
    .health__row[data-tone='warn'] .health__dot  { background: var(--color-warning); }
    .health__row[data-tone='alert'] .health__dot { background: var(--color-danger); }

    .health__body { min-width: 0; }

    .health__label { color: var(--color-text); }

    .health__detail {
      display: block;
      font-size: 0.7rem;
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
    }

    .health__expect {
      font-size: 0.68rem;
      color: var(--color-text-soft);
      white-space: nowrap;
    }
  `],
})
export class JournalFleetHealth {
  readonly workers = input.required<readonly FleetWorker[]>();
  readonly queue = input.required<readonly FleetQueueDepth[]>();
  readonly running = input.required<readonly FleetRunning[]>();
  /** Day-stream registry signals — the collector half of fleet health. */
  readonly signals = input<readonly DayStreamSignal[]>([]);
  /** Injected so the panel renders deterministically under test. */
  readonly now = input<Date>(new Date());

  protected readonly workerRows = computed(() => workerRows(this.workers(), this.now()));

  protected readonly alerts = computed(() =>
    healthAlerts(this.workers(), this.queue(), this.running(), this.signals(), this.now()));

  protected readonly headline = computed(() => healthHeadline(this.alerts()));
}
