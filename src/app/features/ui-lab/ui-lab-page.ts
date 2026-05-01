import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiFormActions } from '@shared/components/ui-form-actions/ui-form-actions';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { TableShell } from '@shared/components/table-shell/table-shell';

type LabProjectStatus = 'active' | 'archived';
type LabField = 'none' | 'title' | 'status';
type LabMailDecision = 'undecided' | 'gem' | 'archive';

interface LabProjectRow {
  readonly id: string;
  readonly displayName: string;
  readonly status: LabProjectStatus;
  readonly owner: string;
  readonly createdAt: string;
}

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
  selector: 'app-ui-lab-page',
  imports: [
    RouterLink,
    TableShell,
    UiBackLink,
    UiBadge,
    UiButton,
    UiCard,
    UiCluster,
    UiEmptyState,
    UiFormActions,
    UiLoadingState,
    UiMetaList,
    UiPageHeader,
    UiSection,
    UiStack,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-stack class="ui-lab" gap="lg">
      <app-ui-page-header>
        <app-ui-back-link uiPageHeaderLead [to]="['/today']">← Today</app-ui-back-link>
        <h1 uiPageHeaderTitle>UI Lab</h1>
        <p uiPageHeaderHint>
          A playground for the neutral dashboard library and a demo of the hybrid edit model:
          small scalar fields edit in place, larger structured fields stay in a dedicated edit flow.
        </p>
        <app-ui-cluster uiPageHeaderActions gap="sm">
          <app-ui-badge tone="info">neutral library</app-ui-badge>
          <app-ui-badge tone="accent">hybrid edit</app-ui-badge>
        </app-ui-cluster>
      </app-ui-page-header>

      <app-ui-section title="Library Surface" [collapsible]="false">
        <app-ui-stack gap="md">
          <app-ui-cluster gap="sm">
            <app-ui-badge tone="success">success</app-ui-badge>
            <app-ui-badge tone="warning">warning</app-ui-badge>
            <app-ui-badge tone="danger">danger</app-ui-badge>
            <app-ui-badge tone="info">info</app-ui-badge>
            <app-ui-badge tone="neutral" [subtle]="true">subtle</app-ui-badge>
          </app-ui-cluster>

          <app-ui-cluster gap="sm">
            <app-ui-button variant="primary">Primary</app-ui-button>
            <app-ui-button variant="secondary">Secondary</app-ui-button>
            <app-ui-button variant="ghost">Ghost</app-ui-button>
            <app-ui-button variant="danger">Danger</app-ui-button>
          </app-ui-cluster>

          <app-ui-meta-list>
            <dt>Intent</dt>
            <dd>Reusable layout and state primitives with theme inheritance layered on later.</dd>
            <dt>Focus</dt>
            <dd>Consistent page structure, information parsing, and keyboard-accessible workflows.</dd>
            <dt>Next phase</dt>
            <dd>Apply a neon theme over stable semantic components instead of styling one-off pages.</dd>
          </app-ui-meta-list>
        </app-ui-stack>
      </app-ui-section>

      <app-ui-section title="Typical List Workflow" [collapsible]="false">
        <app-ui-stack gap="md">
          <app-ui-page-header>
            <h2 uiPageHeaderTitle>Projects</h2>
            <p uiPageHeaderHint>
              Browse rows, scan status quickly, and jump to the entity or advanced edit.
            </p>
            <a uiPageHeaderActions routerLink="/projects/new" class="btn btn--primary">Add project</a>
          </app-ui-page-header>

          <app-table-shell>
            <table class="ui-lab__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Display name</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Created</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                @for (project of sampleProjects; track project.id) {
                  <tr [class.ui-lab__table-row--muted]="project.status === 'archived'">
                    <td><code>{{ project.id }}</code></td>
                    <td>{{ project.displayName }}</td>
                    <td>
                      <app-ui-badge [tone]="project.status === 'active' ? 'success' : 'neutral'">
                        {{ project.status }}
                      </app-ui-badge>
                    </td>
                    <td>{{ project.owner }}</td>
                    <td>{{ project.createdAt }}</td>
                    <td class="ui-lab__actions">
                      <app-ui-cluster justify="end" gap="sm">
                        <a [routerLink]="['/projects', project.id]">View</a>
                        <a [routerLink]="['/projects', project.id, 'edit']">Advanced edit</a>
                      </app-ui-cluster>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </app-table-shell>
        </app-ui-stack>
      </app-ui-section>

      <app-ui-section title="Typical Detail Workflow" [collapsible]="false">
        <app-ui-stack gap="md">
          <app-ui-page-header>
            <app-ui-back-link uiPageHeaderLead [to]="['/projects']">← Projects</app-ui-back-link>
            <h2 uiPageHeaderTitle>Hermes</h2>
            <p uiPageHeaderHint>Inspect core metadata, check recent activity, and choose between inline edits or advanced edit.</p>
            <app-ui-cluster uiPageHeaderActions gap="sm">
              <app-ui-badge tone="success">active</app-ui-badge>
              <a routerLink="/projects/hermes/edit" class="btn btn--secondary">Advanced edit</a>
            </app-ui-cluster>
          </app-ui-page-header>

          <app-ui-meta-list>
            <dt>ID</dt>
            <dd><code>hermes</code></dd>
            <dt>Owner</dt>
            <dd>@marvin</dd>
            <dt>Criteria</dt>
            <dd>Keep the operator-facing workflow fast, explicit, and easy to debug.</dd>
          </app-ui-meta-list>

          <app-ui-empty-state message="No project activity yet." />
        </app-ui-stack>
      </app-ui-section>

      <app-ui-section title="Hybrid Edit Demo" [collapsible]="false">
        <app-ui-stack gap="lg">
          <app-ui-page-header>
            <h2 uiPageHeaderTitle>Project Detail With Inline Edit</h2>
            <p uiPageHeaderHint>
              Small scalar fields edit in place. Large fields stay read-only here and route to advanced edit.
            </p>
            <a uiPageHeaderActions routerLink="/projects/hermes/edit" class="btn btn--secondary">Open advanced edit</a>
          </app-ui-page-header>

          <app-ui-stack gap="md">
            <app-ui-cluster justify="between" align="baseline" gap="sm">
              <h3 class="ui-lab__subhead">Inline-editable summary</h3>
              <app-ui-cluster gap="sm">
                <app-ui-badge [tone]="projectStatus() === 'active' ? 'success' : 'neutral'">
                  {{ projectStatus() }}
                </app-ui-badge>
                @if (hasUnsavedChanges()) {
                  <app-ui-badge tone="warning">unsaved</app-ui-badge>
                }
              </app-ui-cluster>
            </app-ui-cluster>

            <div class="ui-lab__inline-field">
              <div class="ui-lab__inline-copy">
                <span class="ui-lab__inline-label">Display name</span>
                @if (editingField() === 'title') {
                  <label class="visually-hidden" for="ui-lab-project-title">Project display name</label>
                  <input
                    id="ui-lab-project-title"
                    class="ui-lab__inline-input"
                    [value]="draftTitle()"
                    (input)="onDraftTitleInput($event)" />
                } @else {
                  <strong class="ui-lab__inline-value">{{ projectTitle() }}</strong>
                }
              </div>
              <app-ui-cluster gap="sm">
                @if (editingField() === 'title') {
                  <app-ui-button size="sm" variant="primary" (pressed)="saveTitle()">Save</app-ui-button>
                  <app-ui-button size="sm" variant="ghost" (pressed)="cancelEdit()">Cancel</app-ui-button>
                } @else {
                  <app-ui-button size="sm" variant="secondary" (pressed)="startEditing('title')">Edit</app-ui-button>
                }
              </app-ui-cluster>
            </div>

            <div class="ui-lab__inline-field">
              <div class="ui-lab__inline-copy">
                <span class="ui-lab__inline-label">Status</span>
                @if (editingField() === 'status') {
                  <label class="visually-hidden" for="ui-lab-project-status">Project status</label>
                  <select
                    id="ui-lab-project-status"
                    class="ui-lab__inline-input"
                    [value]="draftStatus()"
                    (change)="onDraftStatusChange($event)">
                    <option value="active">active</option>
                    <option value="archived">archived</option>
                  </select>
                } @else {
                  <app-ui-badge [tone]="projectStatus() === 'active' ? 'success' : 'neutral'">
                    {{ projectStatus() }}
                  </app-ui-badge>
                }
              </div>
              <app-ui-cluster gap="sm">
                @if (editingField() === 'status') {
                  <app-ui-button size="sm" variant="primary" (pressed)="saveStatus()">Save</app-ui-button>
                  <app-ui-button size="sm" variant="ghost" (pressed)="cancelEdit()">Cancel</app-ui-button>
                } @else {
                  <app-ui-button size="sm" variant="secondary" (pressed)="startEditing('status')">Edit</app-ui-button>
                }
              </app-ui-cluster>
            </div>

            <div class="ui-lab__inline-field">
              <div class="ui-lab__inline-copy">
                <span class="ui-lab__inline-label">Owner</span>
                <strong class="ui-lab__inline-value">@marvin</strong>
              </div>
              <app-ui-button size="sm" variant="secondary">Edit</app-ui-button>
            </div>
          </app-ui-stack>

          <app-ui-stack gap="md">
            <h3 class="ui-lab__subhead">Fields that stay in advanced edit</h3>
            <app-ui-meta-list>
              <dt>Criteria</dt>
              <dd>Long markdown, validation-heavy text, better handled in a form screen.</dd>
              <dt>Repo URL</dt>
              <dd>Editable, but often paired with validation and related metadata.</dd>
              <dt>Compound settings</dt>
              <dd>Pricing groups, multi-line chains, and structured workflow rules belong in a full form.</dd>
            </app-ui-meta-list>

            <pre class="ui-lab__code-block"><code>{{ criteriaPreview() }}</code></pre>

            <app-ui-form-actions align="between">
              <a routerLink="/projects/hermes/edit" class="btn">Advanced edit</a>
              <app-ui-button variant="ghost" [disabled]="!hasUnsavedChanges()" (pressed)="resetAll()">Reset demo</app-ui-button>
            </app-ui-form-actions>
          </app-ui-stack>
        </app-ui-stack>
      </app-ui-section>

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
                      <td>{{ mail.receivedAt }}</td>
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
                      <td>{{ mail.receivedAt }}</td>
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
                    <dd>{{ mail.receivedAt }}</dd>
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

      <app-ui-section title="Loading States" [collapsible]="false">
        <app-ui-stack gap="sm">
          <app-ui-loading-state label="Loading skills" message="Fetching skill registry." />
          <app-ui-loading-state label="Loading project activity" message="Refreshing recent activity." />
        </app-ui-stack>
      </app-ui-section>

      <app-ui-section title="Form Actions" [collapsible]="false">
        <app-ui-stack gap="md">
          <p class="ui-lab__support-copy">Typical bottom-of-form action rows with different emphases.</p>

          <app-ui-form-actions>
            <a routerLink="/projects" class="btn btn--ghost">Cancel</a>
            <app-ui-button variant="primary">Save changes</app-ui-button>
          </app-ui-form-actions>

          <app-ui-form-actions align="between">
            <app-ui-button variant="danger">Delete</app-ui-button>
            <app-ui-cluster gap="sm">
              <a routerLink="/skills" class="btn btn--ghost">Cancel</a>
              <app-ui-button variant="primary">Create</app-ui-button>
            </app-ui-cluster>
          </app-ui-form-actions>
        </app-ui-stack>
      </app-ui-section>
    </app-ui-stack>
  `,
  styles: [`
    .ui-lab {
      padding: 1.5rem 2rem 3rem;
    }

    .ui-lab__table {
      min-width: 760px;
    }

    .ui-lab__table thead th {
      position: sticky;
      top: 0;
      background: var(--color-surface-soft);
      z-index: 1;
    }

    .ui-lab__table tbody tr:hover {
      background: color-mix(in srgb, var(--color-accent) 5%, transparent);
    }

    .ui-lab__table tbody tr:focus-within {
      outline: 2px solid var(--color-accent);
      outline-offset: -2px;
    }

    .ui-lab__table-row--muted {
      opacity: 0.72;
    }

    .ui-lab__table-row--active {
      background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    }

    .ui-lab__actions {
      width: 1%;
      white-space: nowrap;
      text-align: right;
    }

    .ui-lab__subhead {
      margin: 0;
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .ui-lab__support-copy {
      margin: 0;
      color: var(--color-text-muted);
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .ui-lab__inline-field {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 0;
      border-top: 1px solid var(--color-border);
    }

    .ui-lab__inline-field:first-of-type {
      border-top: none;
      padding-top: 0;
    }

    .ui-lab__inline-copy {
      display: flex;
      flex: 1;
      min-width: 0;
      flex-direction: column;
      gap: 0.25rem;
    }

    .ui-lab__inline-label {
      font-size: 0.72rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-text-soft);
    }

    .ui-lab__inline-value {
      font-size: 1rem;
      color: var(--color-text);
    }

    .ui-lab__inline-input {
      max-width: 24rem;
    }

    .ui-lab__code-block {
      margin: 0;
      padding: 0.9rem 1rem;
      border: 2px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface-soft);
      color: var(--color-text-muted);
      white-space: pre-wrap;
      font-size: 0.84rem;
      line-height: 1.6;
    }

    .ui-lab__expanded-row td {
      background: color-mix(in srgb, var(--color-surface-soft) 92%, var(--color-bg));
    }

    .ui-lab__clickable-row {
      cursor: pointer;
    }

    .ui-lab__clickable-row:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: -2px;
    }

    .ui-lab__inspector-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.5fr) minmax(18rem, 1fr);
      gap: 1rem;
      align-items: start;
    }

    .ui-lab__inspector {
      padding: 1rem;
      min-width: 0;
    }

    @media (max-width: 768px) {
      .ui-lab {
        padding: 1rem 1rem 2rem;
      }

      .ui-lab__inline-field {
        flex-direction: column;
      }

      .ui-lab__inspector-layout {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class UiLabPage {
  protected readonly sampleProjects: readonly LabProjectRow[] = [
    { id: 'hermes', displayName: 'Hermes', status: 'active', owner: '@marvin', createdAt: '2026-04-12' },
    { id: 'dashboard', displayName: 'Dashboard', status: 'active', owner: '@ralph', createdAt: '2026-04-18' },
    { id: 'localshout', displayName: 'Localshout', status: 'archived', owner: '@boris', createdAt: '2026-03-04' },
  ];
  protected readonly sampleMail: readonly LabMailRow[] = [
    {
      id: 'mail-001',
      from: 'Sarah Chen',
      subject: 'Speaker shortlist for Q3 offsite',
      decision: 'undecided',
      receivedAt: '2026-04-29 09:14',
      summary: 'Needs a quick operator decision on whether to pursue two shortlisted speakers.',
      body: 'Sarah shared two speaker options, budget notes, and a suggested follow-up by Friday.',
    },
    {
      id: 'mail-002',
      from: 'OpenRouter',
      subject: 'April usage summary and rate changes',
      decision: 'gem',
      receivedAt: '2026-04-29 13:42',
      summary: 'Contains pricing changes that likely affect model tracking and operator guidance.',
      body: 'Usage summary includes candidate model pricing adjustments and a note about deprecations.',
    },
    {
      id: 'mail-003',
      from: 'Notion',
      subject: 'Weekly digest',
      decision: 'archive',
      receivedAt: '2026-04-30 07:05',
      summary: 'Routine digest with no immediate action required.',
      body: 'Digest contains workspace highlights, trending documents, and reminder suggestions.',
    },
  ];

  readonly projectTitle = signal('Hermes');
  readonly projectStatus = signal<LabProjectStatus>('active');
  readonly draftTitle = signal(this.projectTitle());
  readonly draftStatus = signal<LabProjectStatus>(this.projectStatus());
  readonly editingField = signal<LabField>('none');
  readonly expandedMailId = signal<string | null>(this.sampleMail[0]?.id ?? null);
  readonly inspectedMailId = signal<string | null>(this.sampleMail[1]?.id ?? null);

  readonly hasUnsavedChanges = computed(() =>
    this.projectTitle() !== 'Hermes' || this.projectStatus() !== 'active'
  );
  readonly inspectedMail = computed(() =>
    this.sampleMail.find(mail => mail.id === this.inspectedMailId()) ?? null
  );

  readonly criteriaPreview = computed(() => [
    '# Hermes criteria',
    '',
    '- Keep operator flows inspectable.',
    '- Bias toward fast triage and explicit ownership.',
    '- Preserve escape hatches for advanced edits.',
  ].join('\n'));

  startEditing(field: Exclude<LabField, 'none'>): void {
    this.editingField.set(field);
    if (field === 'title') {
      this.draftTitle.set(this.projectTitle());
    }
    if (field === 'status') {
      this.draftStatus.set(this.projectStatus());
    }
  }

  cancelEdit(): void {
    this.editingField.set('none');
    this.draftTitle.set(this.projectTitle());
    this.draftStatus.set(this.projectStatus());
  }

  saveTitle(): void {
    const next = this.draftTitle().trim();
    if (!next) {
      return;
    }
    this.projectTitle.set(next);
    this.editingField.set('none');
  }

  saveStatus(): void {
    this.projectStatus.set(this.draftStatus());
    this.editingField.set('none');
  }

  resetAll(): void {
    this.projectTitle.set('Hermes');
    this.projectStatus.set('active');
    this.cancelEdit();
  }

  onDraftTitleInput(event: Event): void {
    this.draftTitle.set((event.target as HTMLInputElement).value);
  }

  onDraftStatusChange(event: Event): void {
    this.draftStatus.set((event.target as HTMLSelectElement).value as LabProjectStatus);
  }

  toggleExpandedMail(id: string): void {
    this.expandedMailId.update(current => current === id ? null : id);
  }

  inspectMail(id: string): void {
    this.inspectedMailId.set(id);
  }

  clearInspectedMail(): void {
    this.inspectedMailId.set(null);
  }

  mailDecisionTone(decision: LabMailDecision): 'warning' | 'success' | 'neutral' {
    if (decision === 'gem') return 'success';
    if (decision === 'undecided') return 'warning';
    return 'neutral';
  }
}
