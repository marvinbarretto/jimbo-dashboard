import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-ui-prose-section',
  imports: [UiCard, UiMetaList, UiProse, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Prose" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          For free-text fields (context item content, belief content, question bodies, ...) that
          are often agent-authored and carry real markdown — <code>**bold**</code>, links, code
          spans, lists. <code>app-ui-prose</code> renders that markdown (via the same
          <code>marked</code> pipe as vault item bodies), plus one special case on top: an inline
          enumerated list — <code>"Update: (1) foo, (2) bar, (3) baz."</code> — that would
          otherwise read as a wall of text even once markdown-rendered, split into a real intro +
          list at display time only. The stored string is untouched either way, so nothing
          downstream (agents, API consumers) needs to change.
        </p>

        <app-ui-meta-list>
          <dt>text</dt>
          <dd>the raw string — same one you'd otherwise interpolate directly</dd>
          <dt>plain</dt>
          <dd>default is the serif reading register (.prose-read, shared with the report surface) — set true to opt into the compact sans treatment for dense/tabular contexts</dd>
        </app-ui-meta-list>

        <div>
          <p class="ui-lab__subhead">Plain prose — no markers, renders as-is (default: serif read register)</p>
          <app-ui-card tone="soft">
            <app-ui-prose [text]="plainSample" />
          </app-ui-card>
        </div>

        <div>
          <p class="ui-lab__subhead">plain — compact sans register (dense list/row contexts)</p>
          <app-ui-card tone="soft">
            <app-ui-prose [text]="plainSample" [plain]="true" />
          </app-ui-card>
        </div>

        <div>
          <p class="ui-lab__subhead">Inline enumerated list — split into intro + &lt;ol&gt;</p>
          <app-ui-card tone="soft">
            <app-ui-prose [text]="listSample" />
          </app-ui-card>
        </div>

        <div>
          <p class="ui-lab__subhead">Single "(1)" — not enough markers, stays a paragraph</p>
          <app-ui-card tone="soft">
            <app-ui-prose [text]="falsePositiveSample" />
          </app-ui-card>
        </div>

        <div>
          <p class="ui-lab__subhead">Real markdown — bold, a link, a code span, a list</p>
          <app-ui-card tone="soft">
            <app-ui-prose [text]="markdownSample" />
          </app-ui-card>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class UiProseSection {
  protected readonly plainSample =
    'AI assistant. Daily briefing pipeline running well. Hermes framework is maturing and genuinely exciting — seen as the main accelerant for all projects once LocalShout ships.';

  protected readonly listSample =
    'Current profile says Frontend Developer / Angular specialist — massively undersells what I actually do. Update: (1) Headline → Product Engineer | AI, Full-Stack, React/Next.js, (2) About → rewrite to lead with end-to-end product building (LocalShout, Jimbo AI assistant, BuzzFeed), kill Angular/CSS pitch, (3) Add Independent Product Engineer role for LocalShout + Jimbo (most impressive work is invisible), (4) Update featured skills to Next.js, React, AI/LLM Integration, Full-Stack Dev, TypeScript, Node.js — kill Cypress and UX, (5) Update current role headline at BuzzFeed. This is a 2-hour task, not a week-long project. Do it, then get back to shipping.';

  protected readonly falsePositiveSample =
    'See note (1) for details — the rest of this is ordinary prose, not a list.';

  protected readonly markdownSample =
    'Checked the **auth middleware** against `session_tokens` — see [the compliance doc](https://example.com/compliance) for context. Still open:\n\n- rotate the signing key\n- backfill expiry on old sessions\n- update the runbook';
}
