import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * A prominent, selectable pill for picker UIs — bigger and more tactile than the
 * inline display chips (app-chip / entity-chip). Carries a selected state and a
 * click toggle, an optional accent `color` (drives the selected tint + border),
 * and a leading slot (`[chipLead]`) for an avatar / colour swatch / icon.
 *
 * Fills the gap between app-chip (coloured but not a picker) and ui-filter-pills
 * (a picker but no colour/lead). Use for project / entity selection.
 */
@Component({
  selector: 'app-ui-select-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="chip"
      [class.chip--on]="selected()"
      [class.chip--muted]="!color()"
      [style.--chip]="color()"
      [attr.aria-pressed]="selected()"
      (click)="toggle.emit()">
      <ng-content select="[chipLead]" />
      <span class="chip__label">{{ label() }}</span>
    </button>
  `,
  styles: [`
    :host { display: inline-flex; }

    .chip {
      --chip: var(--color-accent);
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.4rem 0.9rem 0.4rem 0.5rem;
      font: inherit;
      font-size: 0.9rem;
      font-weight: 600;
      border: 1.5px solid var(--color-border);
      border-radius: 2rem;
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      transition: border-color 80ms ease, background 80ms ease;

      &:hover { border-color: var(--chip); }
      &:focus-visible { outline: none; box-shadow: var(--focus-ring); }
      &--muted { --chip: var(--color-text-soft); padding-left: 0.9rem; }
      &--on {
        border-color: var(--chip);
        background: color-mix(in srgb, var(--chip) 16%, transparent);
        box-shadow: inset 0 0 0 1px var(--chip);
      }
    }
  `],
})
export class UiSelectChip {
  readonly label = input.required<string>();
  /** Accent colour (selected tint + border). Omit for a muted chip. */
  readonly color = input<string | null>(null);
  readonly selected = input<boolean>(false);
  readonly toggle = output<void>();
}
