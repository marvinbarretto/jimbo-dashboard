import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TableShell } from '@shared/components/table-shell/table-shell';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
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
  selector: 'app-expandable-rows-section',
  imports: [TableShell, UiBadge, UiButton, UiCluster, UiPageHeader, UiSection, UiStack, DatetimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Expandable Rows Inline" [collapsible]="false">
      <app-ui-stack gap="lg">
        <app-ui-page-header>
          <h2 uiPageHeaderTitle>Expandable Rows Inline</h2>
          <p uiPageHeaderHint>
            Use the whole row as the trigger when the operator should stay in scanning mode and
            reveal more context inline without leaving the table.
          </p>
        </app-ui-page-header>

        <app-ui-stack gap="md">
          <p class="ui-lab__support-copy">
            Good when you want to preserve scanning context and only reveal more detail for one
            row at a time.
          </p>

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
                    [class.ui-lab__table-row--active]="expandedMailId() === mail.id"
                    tabindex="0"
                    role="button"
                    [attr.aria-expanded]="expandedMailId() === mail.id"
                    (click)="toggleExpandedMail(mail.id)"
                    (keydown.enter)="toggleExpandedMail(mail.id)"
                    (keydown.space)="toggleExpandedMail(mail.id); $event.preventDefault()">
                    <td>{{ mail.from }}</td>
                    <td>{{ mail.subject }}</td>
                    <td>
                      <app-ui-badge [tone]="mailDecisionTone(mail.decision)">
                        {{ mail.decision }}
                      </app-ui-badge>
                    </td>
                    <td>{{ mail.receivedAt | datetime }}</td>
                  </tr>
                  @if (expandedMailId() === mail.id) {
                    <tr class="ui-lab__expanded-row">
                      <td colspan="5">
                        <app-ui-stack gap="sm">
                          <p class="ui-lab__support-copy">{{ mail.summary }}</p>
                          <pre class="ui-lab__code-block"><code>{{ mail.body }}</code></pre>
                          <app-ui-cluster gap="sm">
                            <app-ui-button size="sm" variant="primary">Open report</app-ui-button>
                            <app-ui-button size="sm" variant="secondary">Mark gem</app-ui-button>
                            <app-ui-button size="sm" variant="ghost">Archive</app-ui-button>
                          </app-ui-cluster>
                        </app-ui-stack>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </app-table-shell>
        </app-ui-stack>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class ExpandableRowsSection {
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

  protected readonly expandedMailId = signal<string | null>(this.sampleMail[0]?.id ?? null);

  protected mailDecisionTone(decision: LabMailDecision): 'warning' | 'success' | 'neutral' {
    if (decision === 'gem') return 'success';
    if (decision === 'undecided') return 'warning';
    return 'neutral';
  }

  toggleExpandedMail(id: string): void {
    this.expandedMailId.update(current => current === id ? null : id);
  }
}
