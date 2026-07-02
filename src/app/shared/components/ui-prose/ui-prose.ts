import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { parseStructuredProse } from '@shared/utils/prose.utils';

// Renders a plain-text field (context item content, belief content, ...) as
// a paragraph — unless it contains an inline enumerated list ("Update: (1)
// foo, (2) bar."), in which case that gets split into a real intro + <ol>.
// Purely a display transform: the stored string is untouched, so this stays
// agent/API-friendly while fixing the "wall of text" case in the UI.
@Component({
  selector: 'app-ui-prose',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (parsed(); as p) {
      @if (p.intro) {
        <p class="ui-prose__para">{{ p.intro }}</p>
      }
      <ol class="ui-prose__list">
        @for (item of p.items; track $index) {
          <li>{{ item }}</li>
        }
      </ol>
    } @else {
      <p class="ui-prose__para">{{ text() }}</p>
    }
  `,
  styles: [`
    /* The app's base font is monospace (var(--font-mono)) — good for labels,
       code, and data, but fixed-width letterforms make paragraphs of prose
       read slower and take more horizontal space than they need to. Actual
       body copy gets its own treatment: a proportional face, a size below
       the 16px page root (this is card/row-scale reading, not a document),
       and line-height pushed up to compensate — the classic smaller-size /
       taller-leading pairing that keeps dense text from feeling cramped. */
    :host {
      display: block;
      font-family: var(--font-sans);
      font-size: 0.875rem;
      line-height: 1.6;
      letter-spacing: 0.005em;
    }

    .ui-prose__para {
      margin: 0;
    }

    .ui-prose__para + .ui-prose__list {
      margin-top: 0.5rem;
    }

    .ui-prose__list {
      margin: 0;
      padding-left: 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
  `],
})
export class UiProse {
  readonly text = input.required<string>();

  protected readonly parsed = computed(() => parseStructuredProse(this.text()));
}
