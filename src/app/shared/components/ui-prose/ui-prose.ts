import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MarkdownPipe } from '@shared/pipes/markdown.pipe';
import { parseStructuredProse } from '@shared/utils/prose.utils';

// Renders a free-text field (context item content, belief content, question
// bodies, ...) as markdown — agent-authored text routinely carries **bold**,
// lists, links, code spans, etc. that were rendering as literal characters
// before this used `marked` (see MarkdownPipe). The one special case on top:
// an inline enumerated list ("Update: (1) foo, (2) bar.") that reads as a
// wall of text even once markdown-rendered, so it's split into a real intro
// + <ol> first. Purely a display transform: the stored string is untouched.
@Component({
  selector: 'app-ui-prose',
  imports: [MarkdownPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (parsed(); as p) {
      <div class="markdown-body" [class.prose-read]="!plain()">
        @if (p.intro) {
          <div class="ui-prose__para" [innerHTML]="p.intro | markdown"></div>
        }
        <ol class="ui-prose__list">
          @for (item of p.items; track $index) {
            <li [innerHTML]="item | markdown"></li>
          }
        </ol>
      </div>
    } @else {
      <div class="markdown-body" [class.prose-read]="!plain()" [innerHTML]="text() | markdown"></div>
    }
  `,
  styles: [`
    :host {
      display: block;
      padding: 0.4rem 0;
    }

    /* markdown-body (global, src/styles/_markdown.scss) sets its own
       font-family/size directly, so an ancestor .prose-read can't win by
       inheritance — it has to sit on the same element and out-cascade it
       (report.scss loads after markdown.scss in styles.scss). Default is
       that serif reading register, shared with the report surface — most
       prose deserves to be read, not scanned. [plain] opts out for
       dense/tabular contexts (list rows, triage cards), leaving
       markdown-body's own compact sans treatment in place. */

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
  // Default is the shared serif reading register (.prose-read). Set true to
  // opt into the compact sans treatment for dense/tabular contexts.
  readonly plain = input(false);

  protected readonly parsed = computed(() => parseStructuredProse(this.text()));
}
