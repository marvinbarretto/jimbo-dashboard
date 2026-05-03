import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-vault-item-intake-block',
  imports: [UiSubsection, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-subsection label="Intake" hint="(immutable input)">
      @if (body()) {
        <pre class="vault-item-intake-block__body">{{ body() }}</pre>
      } @else {
        <p class="vault-item-intake-block__muted">no body content</p>
      }
      <p class="vault-item-intake-block__note">{{ createdAt() | relativeTime }} · operator intake</p>
    </app-ui-subsection>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }

    .vault-item-intake-block__body {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-left: 2px solid var(--color-border);
      padding: 0.4rem 0.6rem;
      margin: 0;
      font-size: 0.8rem;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: inherit;
    }

    .vault-item-intake-block__note {
      font-size: 0.65rem;
      color: var(--color-text-muted);
      margin: 0.25rem 0 0;
    }

    .vault-item-intake-block__muted {
      color: var(--color-text-muted);
      font-size: 0.75rem;
      margin: 0;
    }
  `],
})
export class VaultItemIntakeBlock {
  readonly body = input.required<string>();
  readonly createdAt = input.required<string>();
}
