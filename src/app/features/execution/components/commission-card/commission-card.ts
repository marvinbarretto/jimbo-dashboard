import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CommissionItem } from '@domain/dispatch';
import type { ProjectRef } from '@shared/components/vault-card/card-context';
import { CommissionStagePill } from '@shared/components/commission-stage-pill/commission-stage-pill';
import { ActorAvatar } from '@shared/components/actor-avatar/actor-avatar';

// Operator actions a commission card can emit. A subset of vault-card's ActionKey
// (so the board's existing onDispatchAction handler accepts them unchanged).
export type CommissionAction = 'retry' | 'dismiss' | 'archive';

// Organism — ONE card per vault item's commission, the unit the rebuilt execution
// board renders (vs the old one-card-per-dispatch). Composes the commission-stage
// -pill atom + the reused actor-avatar atom; the project is a routerLink + colour
// dot, mirroring vault-card. History drill-down + PR badge land in the next
// increment. Sets :host display (it's a layout container, not a leaf atom).
@Component({
  selector: 'app-commission-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CommissionStagePill, ActorAvatar],
  template: `
    <article class="cc">
      <header class="cc__top">
        <button type="button" class="cc__title" (click)="open.emit()">
          @if (item().taskSeq !== null) { <span class="cc__seq">#{{ item().taskSeq }}</span> }
          <span class="cc__name">{{ item().taskTitle ?? 'untitled' }}</span>
        </button>
        <app-commission-stage-pill [stage]="item().stage" />
      </header>

      <div class="cc__meta">
        @if (executor(); as ex) {
          <app-actor-avatar [actor]="ex" size="sm" />
        }
        @if (project(); as proj) {
          <a class="cc__project" [routerLink]="['/projects', proj.id]"
             [style.--dot]="proj.color_token ?? 'var(--color-text-muted)'">
            {{ proj.display_name }}
          </a>
        }
        @if (dispatchCount() > 1) {
          <span class="cc__history" [attr.title]="dispatchCount() + ' commission dispatches'">
            ×{{ dispatchCount() }}
          </span>
        }
      </div>

      @if (item().stage === 'failed' && item().latest.error; as err) {
        <p class="cc__error">{{ err }}</p>
      }

      @if (actions().length) {
        <footer class="cc__actions">
          @for (a of actions(); track a) {
            <button
              type="button"
              class="cc__action"
              [class.cc__action--warn]="a === 'retry'"
              (click)="action.emit(a)"
            >{{ a }}</button>
          }
        </footer>
      }
    </article>
  `,
  styles: [`
    :host { display: block; }
    .cc {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      padding: 0.55rem 0.6rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
    }
    .cc__top { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; }
    .cc__title {
      display: flex; flex-direction: column; gap: 0.1rem;
      background: none; border: none; padding: 0; margin: 0;
      text-align: left; cursor: pointer; color: var(--color-text); min-width: 0;
    }
    .cc__title:hover .cc__name { text-decoration: underline; }
    .cc__seq { font-family: var(--font-mono); font-size: 0.6rem; color: var(--color-text-muted); }
    .cc__name {
      font-size: 0.8rem; line-height: 1.25;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .cc__meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .cc__project {
      display: inline-flex; align-items: center; gap: 0.3rem;
      font-size: 0.65rem; color: var(--color-text-soft); text-decoration: none;
    }
    .cc__project::before {
      content: ''; width: 0.5rem; height: 0.5rem; border-radius: 50%;
      background: var(--dot); flex: none;
    }
    .cc__project:hover { text-decoration: underline; }
    .cc__history { font-family: var(--font-mono); font-size: 0.6rem; color: var(--color-text-muted); }
    .cc__error {
      margin: 0; font-size: 0.65rem; color: var(--color-danger);
      font-family: var(--font-mono); word-break: break-word;
    }
    .cc__actions { display: flex; gap: 0.3rem; flex-wrap: wrap; }
    .cc__action {
      font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em;
      padding: 0.15rem 0.45rem; border: 1px solid var(--color-border);
      border-radius: 3px; background: none; color: var(--color-text-muted); cursor: pointer;
    }
    .cc__action:hover { color: var(--color-text); border-color: var(--color-text-muted); }
    .cc__action--warn { color: var(--color-warning); border-color: var(--color-warning); }
  `],
})
export class CommissionCard {
  readonly item = input.required<CommissionItem>();
  readonly project = input<ProjectRef | null>(null);

  readonly open = output<void>();
  readonly action = output<CommissionAction>();

  readonly executor = computed(() => this.item().executor);
  readonly dispatchCount = computed(() => this.item().history.length);

  // Actions per stage. In-flight stages (proposed/approved/running) are passive —
  // hermes drives them. Terminal stages can be dismissed (hard-delete the
  // dispatch) or archived (the task); failed adds retry.
  readonly actions = computed<CommissionAction[]>(() => {
    switch (this.item().stage) {
      case 'failed':    return ['retry', 'dismiss', 'archive'];
      case 'pr_open':
      case 'merged':
      case 'completed':
      case 'rejected':  return ['dismiss', 'archive'];
      default:          return [];
    }
  });
}
