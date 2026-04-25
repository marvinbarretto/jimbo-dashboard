import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

// Generic clickable pill. Used for filter chips, action toggles, etc.
// `tone` is a free-form string appended as a class suffix (`chip--{tone}`)
// so callers can opt into project / actor / priority tints without this
// component knowing the palette.
@Component({
  selector: 'app-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [class]="cls()"
      [disabled]="disabled()"
      (click)="onClick()"
    >
      <ng-content />
      @if (count() !== null && count() !== undefined) {
        <span class="chip__count">{{ count() }}</span>
      }
    </button>
  `,
  styles: [`
    .chip {
      font: inherit;
      font-size: 0.7rem;
      padding: 0.15rem 0.55rem;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: var(--color-surface);
      color: var(--color-text-muted);
      cursor: pointer;
      transition: border-color 0.1s, color 0.1s, background 0.1s;
      line-height: 1.4;
    }
    .chip:hover:not(:disabled) {
      color: var(--color-text);
      border-color: var(--color-text-muted);
    }
    .chip:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    /* Active = part of the current selection. */
    .chip--active {
      background: color-mix(in srgb, var(--color-accent) 18%, var(--color-surface));
      border-color: var(--color-accent);
      color: var(--color-text);
    }
    .chip__count {
      margin-left: 0.3rem;
      font-size: 0.6rem;
      opacity: 0.7;
      font-variant-numeric: tabular-nums;
    }
  `],
})
export class Chip {
  readonly active   = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly count    = input<number | null | undefined>(undefined);
  readonly tone     = input<string | null>(null);

  readonly toggle = output<void>();

  readonly cls = computed(() => {
    const parts = ['chip'];
    if (this.active())  parts.push('chip--active');
    if (this.tone())    parts.push(`chip--${this.tone()}`);
    return parts.join(' ');
  });

  onClick(): void {
    if (!this.disabled()) this.toggle.emit();
  }
}
