import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { commissionStage, type DispatchQueueEntry } from '@domain/dispatch';
import { CommissionStagePill } from '@shared/components/commission-stage-pill/commission-stage-pill';

// Organism — the per-item commission history, shown when a commission-card is
// expanded. Each row is one dispatch (newest first): its derived stage, when it
// ran, the result/error, and a PR link when present. This is what makes a
// superseded attempt visible — e.g. a merged PR that a later re-commission
// pushed into history (so the merge isn't silently lost behind the newer stage).
@Component({
  selector: 'app-dispatch-history-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, CommissionStagePill],
  template: `
    <ol class="dh">
      @for (row of history(); track row.id) {
        <li class="dh__row">
          <div class="dh__head">
            <app-commission-stage-pill [stage]="stageOf(row)" />
            <time class="dh__when">{{ row.created_at | date:'MMM d, HH:mm' }}</time>
            @if (row.retry_count > 0) { <span class="dh__retry">retry {{ row.retry_count }}</span> }
          </div>
          @if (row.result_summary) { <p class="dh__summary">{{ row.result_summary }}</p> }
          @if (row.error) { <p class="dh__error">{{ row.error }}</p> }
          @if (row.pr_url) {
            <a class="dh__pr" [href]="row.pr_url" target="_blank" rel="noopener">view PR ↗</a>
          }
        </li>
      }
    </ol>
  `,
  styles: [`
    :host { display: block; }
    .dh { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
    .dh__row {
      border-left: 2px solid var(--color-border);
      padding: 0.1rem 0 0.1rem 0.5rem;
      display: flex; flex-direction: column; gap: 0.15rem;
    }
    .dh__head { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
    .dh__when { font-family: var(--font-mono); font-size: 0.6rem; color: var(--color-text-muted); }
    .dh__retry { font-family: var(--font-mono); font-size: 0.6rem; color: var(--color-warning); }
    .dh__summary { margin: 0; font-size: 0.65rem; color: var(--color-text-soft); }
    .dh__error { margin: 0; font-size: 0.65rem; color: var(--color-danger); font-family: var(--font-mono); word-break: break-word; }
    .dh__pr { font-size: 0.65rem; color: var(--color-accent); text-decoration: none; }
    .dh__pr:hover { text-decoration: underline; }
  `],
})
export class DispatchHistoryList {
  readonly history = input.required<readonly DispatchQueueEntry[]>();

  stageOf(entry: DispatchQueueEntry) {
    return commissionStage(entry);
  }
}
