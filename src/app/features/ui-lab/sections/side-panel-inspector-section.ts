import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { TableShell } from '@shared/components/table-shell/table-shell';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiFormActions } from '@shared/components/ui-form-actions/ui-form-actions';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { DatetimePipe } from '@shared/pipes/datetime.pipe';

type LabMailDecision = 'undecided' | 'gem' | 'archive';

interface LabMailRow {
  readonly id: string;
  readonly from: string;
  readonly subject: string;
  readonly decision: LabMailDecision;
  readonly receivedAt: string;
  readonly summary: string;
  readonly body: string;
}

@Component({
  selector: 'app-side-panel-inspector-section',
  imports: [
    TableShell, UiBadge, UiButton, UiCard, UiCluster, UiEmptyState,
    UiFormActions, UiMetaList, UiPageHeader, UiSection, UiStack, DatetimePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Side-Panel Inspector" [collapsible]="false">
      <app-ui-stack gap="lg">
        <app-ui-page-header>
          <h2 uiPageHeaderTitle>Side-Panel Inspector</h2>
          <p uiPageHeaderHint>
            Use a persistent inspector when the row needs deeper detail, richer actions, or a
            longer reading surface than the table itself should carry.
          </p>
        </app-ui-page-header>

        <div class="ui-lab__inspector-layout">
          <app-table-shell>
            <table class="ui-lab__table ui-lab__table--mail">
              <thead>
                <tr>
                  <th>From</th>
                  <th>Subject</th>
                  <th>Decision</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                @for (mail of sampleMail; track mail.id) {
                  <tr
                    class="ui-lab__clickable-row"
                    [class.ui-lab__table-row--active]="inspectedMail()?.id === mail.id"
                    tabindex="0"
                    role="button"
                    [attr.aria-pressed]="inspectedMail()?.id === mail.id"
                    (click)="inspectMail(mail.id)"
                    (keydown.enter)="inspectMail(mail.id)"
                    (keydown.space)="inspectMail(mail.id); $event.preventDefault()">
                    <td>{{ mail.from }}</td>
                    <td>{{ mail.subject }}</td>
                    <td>
                      <app-ui-badge [tone]="mailDecisionTone(mail.decision)">
                        {{ mail.decision }}
                      </app-ui-badge>
                    </td>
                    <td>{{ mail.receivedAt | datetime }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </app-table-shell>

          <app-ui-card tone="soft">
            <app-ui-stack class="ui-lab__inspector" gap="md">
              @if (inspectedMail(); as mail) {
                <app-ui-cluster justify="between" align="start" gap="sm">
                  <div class="ui-lab__inline-copy">
                    <span class="ui-lab__inline-label">Selected message</span>
                    <strong class="ui-lab__inline-value">{{ mail.subject }}</strong>
                  </div>
                  <app-ui-badge [tone]="mailDecisionTone(mail.decision)">
                    {{ mail.decision }}
                  </app-ui-badge>
                </app-ui-cluster>

                <app-ui-meta-list>
                  <dt>From</dt>
                  <dd>{{ mail.from }}</dd>
                  <dt>Received</dt>
                  <dd>{{ mail.receivedAt | datetime }}</dd>
                  <dt>Summary</dt>
                  <dd>{{ mail.summary }}</dd>
                </app-ui-meta-list>

                <pre class="ui-lab__code-block"><code>{{ mail.body }}</code></pre>

                <app-ui-form-actions align="between">
                  <app-ui-button variant="ghost" (pressed)="clearInspectedMail()">Close</app-ui-button>
                  <app-ui-cluster gap="sm">
                    <app-ui-button size="sm" variant="secondary">Archive</app-ui-button>
                    <app-ui-button size="sm" variant="primary">Open full detail</app-ui-button>
                  </app-ui-cluster>
                </app-ui-form-actions>
              } @else {
                <app-ui-empty-state
                  title="No message selected"
                  message="Choose a row to inspect the full payload and actions in a side panel." />
              }
            </app-ui-stack>
          </app-ui-card>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class SidePanelInspectorSection {
  protected readonly sampleMail: readonly LabMailRow[] = [
    {
      id: 'mail-001', from: 'Sarah Chen', subject: 'Speaker shortlist for Q3 offsite',
      decision: 'undecided', receivedAt: '2026-04-29T09:14:00.000Z',
      summary: 'Needs a quick operator decision on whether to pursue two shortlisted speakers.',
      body: 'Sarah shared two speaker options, budget notes, and a suggested follow-up by Friday.',
    },
    {
      id: 'mail-002', from: 'OpenRouter', subject: 'April usage summary and rate changes',
      decision: 'gem', receivedAt: '2026-04-29T13:42:00.000Z',
      summary: 'Contains pricing changes that likely affect model tracking and operator guidance.',
      body: 'Usage summary includes candidate model pricing adjustments and a note about deprecations.',
    },
    {
      id: 'mail-003', from: 'Notion', subject: 'Weekly digest',
      decision: 'archive', receivedAt: '2026-04-30T07:05:00.000Z',
      summary: 'Routine digest with no immediate action required.',
      body: 'Digest contains workspace highlights, trending documents, and reminder suggestions.',
    },
  ];

  protected readonly inspectedMailId = signal<string | null>(this.sampleMail[1]?.id ?? null);
  protected readonly inspectedMail = computed(() =>
    this.sampleMail.find(mail => mail.id === this.inspectedMailId()) ?? null
  );

  protected mailDecisionTone(decision: LabMailDecision): 'warning' | 'success' | 'neutral' {
    if (decision === 'gem') return 'success';
    if (decision === 'undecided') return 'warning';
    return 'neutral';
  }

  inspectMail(id: string): void {
    this.inspectedMailId.set(id);
  }

  clearInspectedMail(): void {
    this.inspectedMailId.set(null);
  }
}
