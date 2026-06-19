import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { COMMISSION_STAGE_LABELS, type CommissionStage } from '@domain/dispatch';

// Atom — pill showing a commission's lifecycle stage on the execution board.
// Mirrors dispatch-status-badge's inner-<span> pattern (display set in styles,
// not :host) and the active-chip palette so it reads consistently with filters.
//   proposed  — info blue   (awaiting operator approval; needs attention)
//   approved  — muted       (queued)
//   running   — warning      (executor working)
//   pr_open   — accent       (PR up, awaiting merge)
//   merged    — success      (shipped)
//   completed — soft         (finished; PR status unreported — common, see #14)
//   failed    — danger       (errored / reaped)
//   rejected  — muted danger (deliberate decline — distinct from a crash)
@Component({
  selector: 'app-commission-stage-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="cls()">{{ label() }}</span>`,
  styles: [`
    .pill {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 0.6rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.05rem 0.4rem;
      border: 1px solid;
      border-radius: 3px;
      line-height: 1.4;
    }
    .pill--proposed  { color: var(--color-info);       border-color: var(--color-info);       }
    .pill--approved  { color: var(--color-text-muted); border-color: var(--color-text-muted); }
    .pill--running   { color: var(--color-warning);    border-color: var(--color-warning);    }
    .pill--pr_open   { color: var(--color-accent);     border-color: var(--color-accent);     }
    .pill--merged    { color: var(--color-success);    border-color: var(--color-success);    }
    .pill--completed { color: var(--color-text-soft);  border-color: var(--color-text-soft);  }
    .pill--failed    { color: var(--color-danger);     border-color: var(--color-danger);     }
    /* rejected: deliberate decline — danger border but muted text so it doesn't
       read as alarming as a crash (failed). */
    .pill--rejected  { color: var(--color-text-muted); border-color: var(--color-danger);     }
  `],
})
export class CommissionStagePill {
  readonly stage = input.required<CommissionStage>();

  readonly label = computed(() => COMMISSION_STAGE_LABELS[this.stage()]);
  readonly cls = computed(() => `pill pill--${this.stage()}`);
}
