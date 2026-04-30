import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-loading-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-loading-state" role="status" aria-live="polite" [attr.aria-label]="label()">
      <span class="ui-loading-state__dot" aria-hidden="true"></span>
      <span class="ui-loading-state__message">{{ message() }}</span>
    </div>
  `,
  styles: [`
    .ui-loading-state {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      padding: 1rem 0.75rem;
      color: var(--color-text-muted);
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .ui-loading-state__dot {
      width: 0.65rem;
      height: 0.65rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-accent) 70%, var(--color-text-muted));
      box-shadow: 0 0 0 0.2rem color-mix(in srgb, var(--color-accent) 18%, transparent);
      flex-shrink: 0;
    }
  `],
})
export class UiLoadingState {
  readonly message = input('Loading…');
  readonly label = input('Loading');
}
