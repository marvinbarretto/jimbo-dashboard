import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import type { VaultItem } from '@domain/vault/vault-item';

@Component({
  selector: 'app-vault-item-identity-header',
  imports: [UiBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="vault-item-identity-header">
      <span class="vault-item-identity-header__seq">#{{ item().seq }}</span>
      <app-ui-badge tone="info" [subtle]="true">{{ item().type }}</app-ui-badge>
      @if (editing()) {
        <input
          #titleInput
          class="vault-item-identity-header__input"
          type="text"
          [value]="draft()"
          (input)="onInput($event)"
          (keydown)="onKey($event)"
          (blur)="commit()"
        />
      } @else {
        <h1
          class="vault-item-identity-header__title"
          tabindex="0"
          role="button"
          aria-label="Edit title"
          (click)="startEdit()"
          (keydown.enter)="startEdit()"
          (keydown.space)="startEdit()"
        >{{ item().title }}</h1>
      }
    </header>
  `,
  styles: [`
    :host {
      display: block;
    }

    .vault-item-identity-header {
      display: flex;
      gap: 0.55rem;
      align-items: center;
      flex-wrap: wrap;
      padding: 0.85rem 0.9rem 0.7rem;
      border-bottom: 1px solid color-mix(in srgb, var(--color-border) 92%, transparent);
      background:
        linear-gradient(180deg,
          color-mix(in srgb, var(--color-surface-raised) 55%, transparent),
          color-mix(in srgb, var(--color-surface) 95%, transparent));
    }

    .vault-item-identity-header__seq {
      opacity: 0.72;
      font-family: var(--font-mono, monospace);
      font-size: 0.74rem;
      color: var(--color-text-soft);
    }

    .vault-item-identity-header__title {
      margin: 0;
      font-size: 1.02rem;
      font-weight: 650;
      letter-spacing: -0.01em;
      flex: 1;
      min-width: min(24rem, 100%);
      cursor: text;
      border-radius: var(--radius);
      padding: 0.1rem 0.25rem;
      margin: -0.1rem -0.25rem;

      &:hover { background: color-mix(in srgb, var(--color-accent) 8%, transparent); }
      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 1px;
      }
    }

    .vault-item-identity-header__input {
      flex: 1;
      min-width: min(24rem, 100%);
      padding: 0.1rem 0.3rem;
      margin: -0.1rem -0.25rem;
      font: inherit;
      font-size: 1.02rem;
      font-weight: 650;
      letter-spacing: -0.01em;
      border: 1px solid var(--color-accent);
      border-radius: var(--radius);
      background: var(--color-bg-elevated, var(--color-bg));
      color: var(--color-text);

      &:focus { outline: none; }
    }
  `],
})
export class VaultItemIdentityHeader {
  readonly item = input.required<VaultItem>();
  readonly titleChange = output<string>();

  protected readonly editing = signal(false);
  protected readonly draft = signal('');
  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  // When the bound item changes (e.g. dialog swaps to a new seq), drop edit state.
  private readonly currentTitle = computed(() => this.item().title);
  constructor() {
    effect(() => {
      this.currentTitle();
      this.editing.set(false);
    });
  }

  startEdit(): void {
    this.draft.set(this.item().title);
    this.editing.set(true);
    queueMicrotask(() => {
      const el = this.inputRef()?.nativeElement;
      el?.focus();
      el?.select();
    });
  }

  onInput(e: Event): void {
    this.draft.set((e.target as HTMLInputElement).value);
  }

  onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') { e.preventDefault(); this.commit(); }
    else if (e.key === 'Escape') { e.preventDefault(); this.cancel(); }
  }

  commit(): void {
    if (!this.editing()) return;
    const next = this.draft().trim();
    this.editing.set(false);
    if (next && next !== this.item().title) this.titleChange.emit(next);
  }

  private cancel(): void {
    this.editing.set(false);
    this.draft.set(this.item().title);
  }
}
