import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

// Single-button "+ new item" trigger for kanban-style boards. Title-less by
// design — clicking emits (create) and the parent is responsible for spawning
// a placeholder item and opening the detail dialog so the operator can fill in
// title, body, priority etc. in-place.
@Component({
  selector: 'app-board-create-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="bcb__toggle" (click)="create.emit()">
      + {{ buttonLabel() }}
    </button>
  `,
  styles: [`
    :host { display: block; }
    .bcb__toggle {
      padding: 0.45rem 0.8rem;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius);
      background: transparent;
      color: var(--color-text-muted);
      font: inherit;
      font-size: 0.8rem;
      cursor: pointer;

      &:hover {
        border-color: var(--color-accent);
        color: var(--color-text);
      }
    }
  `],
})
export class BoardCreateBar {
  readonly buttonLabel = input<string>('Add item');
  readonly create = output<void>();
}
