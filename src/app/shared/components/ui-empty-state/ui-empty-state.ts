import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-empty-state" [attr.role]="role()">
      @if (title(); as heading) {
        <p class="ui-empty-state__title">{{ heading }}</p>
      }
      @if (message(); as detail) {
        <p class="ui-empty-state__message">{{ detail }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: [`
    .ui-empty-state {
      padding: 1rem 0.75rem;
      color: var(--color-text-muted);
    }

    .ui-empty-state__title {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .ui-empty-state__message {
      margin: 0.25rem 0 0;
      font-size: 0.85rem;
      line-height: 1.5;
      color: var(--color-text-muted);
    }
  `],
})
export class UiEmptyState {
  readonly title = input<string | null>(null);
  readonly message = input<string | null>(null);
  readonly role = input<'status' | 'note'>('note');
}
