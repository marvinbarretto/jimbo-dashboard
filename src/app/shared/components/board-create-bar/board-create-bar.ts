import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';

// Inline "+ new item" input for kanban-style boards. Stays out of the way until
// you click it; Enter submits, Esc collapses. Owner is fire-and-forget — we
// emit the trimmed title and reset; the parent owns the optimistic insert.
@Component({
  selector: 'app-board-create-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="bcb">
        <input
          #inputEl
          class="bcb__input"
          type="text"
          [value]="value()"
          [placeholder]="placeholder()"
          (input)="onInput($event)"
          (keydown)="onKey($event)"
          (blur)="onBlur()"
        />
        <button type="button" class="bcb__submit" (click)="submit()">add</button>
      </div>
    } @else {
      <button type="button" class="bcb__toggle" (click)="expand()">
        + {{ buttonLabel() }}
      </button>
    }
  `,
  styles: [`
    :host { display: block; }
    .bcb {
      display: flex;
      gap: 0.4rem;
      align-items: stretch;
    }
    .bcb__input {
      flex: 1;
      padding: 0.45rem 0.6rem;
      border: 1px solid var(--color-accent);
      border-radius: var(--radius);
      background: var(--color-bg-elevated, var(--color-bg));
      color: var(--color-text);
      font: inherit;
      font-size: 0.85rem;

      &:focus { outline: none; border-color: var(--color-accent); }
    }
    .bcb__submit {
      padding: 0 0.8rem;
      border: 1px solid var(--color-accent);
      border-radius: var(--radius);
      background: var(--color-accent);
      color: var(--color-bg);
      font: inherit;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
    }
    .bcb__toggle {
      padding: 0.4rem 0.7rem;
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
  readonly placeholder = input<string>('Title — Enter to add, Esc to cancel');
  readonly buttonLabel = input<string>('Add item');
  readonly create = output<string>();

  protected readonly open = signal(false);
  protected readonly value = signal('');
  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('inputEl');

  protected expand(): void {
    this.open.set(true);
    queueMicrotask(() => this.inputRef()?.nativeElement.focus());
  }

  protected onInput(e: Event): void {
    this.value.set((e.target as HTMLInputElement).value);
  }

  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.cancel();
    }
  }

  protected onBlur(): void {
    if (this.value().trim() === '') this.cancel();
  }

  protected submit(): void {
    const v = this.value().trim();
    if (!v) return;
    this.create.emit(v);
    this.value.set('');
    // Stay open so a flurry of items can be added without re-clicking.
    queueMicrotask(() => this.inputRef()?.nativeElement.focus());
  }

  private cancel(): void {
    this.value.set('');
    this.open.set(false);
  }
}
