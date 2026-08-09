import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, type Data } from '@angular/router';

/**
 * Placeholder for a phone-shell tab that hasn't been built yet.
 *
 * Reads its copy from route `data` so the three unbuilt tabs share one
 * component — each is swapped out individually by pointing its route at the
 * real container. Route data rather than `input()`s because the app doesn't
 * enable `withComponentInputBinding()`, and turning it on globally would start
 * binding params to inputs across all 96 routes.
 */
@Component({
  selector: 'app-mobile-tab-stub',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="stub__title">{{ heading() }}</h1>
    <p class="stub__note">{{ note() }}</p>
  `,
  styles: [
    `
      :host {
        display: block;
        padding-block: 1.5rem;
      }

      .stub__title {
        margin: 0 0 0.5rem;
        font-size: 1.25rem;
      }

      .stub__note {
        margin: 0;
        color: var(--color-text-muted);
        font-size: 0.875rem;
        line-height: 1.5;
      }
    `,
  ],
})
export class MobileTabStub {
  private readonly data = toSignal(inject(ActivatedRoute).data, { initialValue: {} as Data });

  protected readonly heading = computed(() => String(this.data()['heading'] ?? ''));
  protected readonly note = computed(() => String(this.data()['note'] ?? ''));
}
