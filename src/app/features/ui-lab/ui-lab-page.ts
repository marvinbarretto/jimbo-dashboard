import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiChecklist, type UiChecklistItem } from '@shared/components/ui-checklist/ui-checklist';
import { UiChipList, type UiChipListItem, type UiChipListPickerOption } from '@shared/components/ui-chip-list/ui-chip-list';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiDropdown } from '@shared/components/ui-dropdown/ui-dropdown';
import { UiInlinePicker, type UiInlinePickerOption } from '@shared/components/ui-inline-picker/ui-inline-picker';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiFormActions } from '@shared/components/ui-form-actions/ui-form-actions';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiReadinessPanel, type UiReadinessData } from '@shared/components/ui-readiness-panel/ui-readiness-panel';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiStickyActionBar } from '@shared/components/ui-sticky-action-bar/ui-sticky-action-bar';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import { UiTabBar } from '@shared/components/ui-tab-bar/ui-tab-bar';
import { UiToggle } from '@shared/components/ui-toggle/ui-toggle';
import { TableShell } from '@shared/components/table-shell/table-shell';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
import { DatetimePipe } from '@shared/pipes/datetime.pipe';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';

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

export interface LabRegistryEntry {
  readonly id: string;
  readonly name: string;
  readonly selector?: string;
  readonly description: string;
}

export const componentRegistry: readonly LabRegistryEntry[] = [
  { id: 'library-surface',        name: 'Library Surface',       description: 'Badges, buttons, and meta-list overview.' },
  { id: 'toggle',                  name: 'Toggle',                selector: 'app-ui-toggle',         description: 'Boolean slide toggle with role="switch" accessibility.' },
  { id: 'entity-chip',             name: 'Entity Chip',           selector: 'app-entity-chip',       description: 'Inline chip for actors, projects, and vault items.' },
  { id: 'vault-detail-primitives', name: 'Vault Primitives',      description: 'Stat card, chip list, inline picker, dropdown, readiness panel, checklist, sticky action bar, subsection.' },
  { id: 'tab-bar',                 name: 'Tab Bar',               selector: 'app-ui-tab-bar',        description: 'Underline-style tab bar for router or signal-based tabs.' },
  { id: 'list-workflow',           name: 'List Workflow',         description: 'Typical page header + table pattern for browsable lists.' },
  { id: 'detail-workflow',         name: 'Detail Workflow',       description: 'Typical back-link + meta-list pattern for entity detail pages.' },
  { id: 'hybrid-edit',             name: 'Hybrid Edit',           description: 'Inline edit for scalar fields; advanced edit for structured fields.' },
  { id: 'expandable-rows',         name: 'Expandable Rows',       description: 'Whole-row trigger revealing inline context without leaving the table.' },
  { id: 'side-panel-inspector',    name: 'Side-Panel Inspector',  description: 'Persistent inspector panel for richer detail and actions.' },
  { id: 'loading-states',          name: 'Loading States',        selector: 'app-ui-loading-state',  description: 'Labelled loading spinner for async content.' },
  { id: 'datetime-pipes',          name: 'Date & Time Pipes',     description: 'datetime and relativeTime pipes for ISO string formatting.' },
  { id: 'form-actions',            name: 'Form Actions',          selector: 'app-ui-form-actions',   description: 'Standardised bottom-of-form action row layout.' },
];

@Component({
  selector: 'app-ui-lab-page',
  imports: [
    RouterLink,
    EntityChip,
    TableShell,
    UiBackLink,
    UiBadge,
    UiButton,
    UiCard,
    UiChecklist,
    UiChipList,
    UiCluster,
    UiDropdown,
    UiInlinePicker,
    UiEmptyState,
    UiFormActions,
    UiLoadingState,
    UiMetaList,
    UiPageHeader,
    UiReadinessPanel,
    UiSection,
    UiStack,
    UiStatCard,
    UiStickyActionBar,
    UiSubhead,
    UiSubsection,
    UiTabBar,
    UiToggle,
    DatetimePipe,
    RelativeTimePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-lab">

      <nav class="ui-lab__sidenav" aria-label="Component sections">
        <ul class="ui-lab__sidenav-list">
          @for (entry of registry; track entry.id) {
            <li>
              <a class="ui-lab__sidenav-link" [routerLink]="[]" [fragment]="entry.id">{{ entry.name }}</a>
            </li>
          }
        </ul>
      </nav>

      <div class="ui-lab__content">
        <app-ui-stack gap="lg">
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

          <app-ui-section id="library-surface" title="Library Surface" [collapsible]="false">
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

          <app-ui-section id="toggle" title="Toggle" [collapsible]="false">
            <app-ui-stack gap="md">
              <p class="ui-lab__support-copy">
                Slide toggle for boolean settings. Uses <code>role="switch"</code> and
                <code>aria-checked</code>. OFF state is <code>--color-danger</code> (red);
                ON state is <code>--color-success</code> (green). Inputs: <code>checked</code>,
                <code>label</code>, <code>disabled</code>. Output: <code>changed</code> emits the
                new boolean.
              </p>

              <div>
                <p class="ui-lab__subhead">States</p>
                <app-ui-cluster gap="lg" align="center">
                  <app-ui-toggle [checked]="false" label="Off example" />
                  <app-ui-toggle [checked]="true" label="On example" />
                  <app-ui-toggle [checked]="false" [disabled]="true" label="Disabled off" />
                  <app-ui-toggle [checked]="true" [disabled]="true" label="Disabled on" />
                </app-ui-cluster>
              </div>

              <div>
                <p class="ui-lab__subhead">Interactive</p>
                <app-ui-cluster gap="md" align="center">
                  <app-ui-toggle
                    [checked]="labToggle()"
                    label="Interactive toggle"
                    (changed)="labToggle.set($event)"
                  />
                  <span class="ui-lab__support-copy">Value: {{ labToggle() ? 'on' : 'off' }}</span>
                </app-ui-cluster>
              </div>
            </app-ui-stack>
          </app-ui-section>

          <app-ui-section id="entity-chip" title="Entity Chip" [collapsible]="false">
            <app-ui-stack gap="md">
              <p class="ui-lab__support-copy">
                Unified inline chip for actors, projects, and vault items. Prefix (<code>@</code>,
                <code>/</code>, <code>#</code>) is derived from type. Colour token follows the same
                <code>--actor-color-*</code> / <code>--project-color-*</code> convention.
                Replaces the retired <code>OwnerChip</code> and <code>ProjectChip</code> components.
                Vault items accept an optional <code>seq</code> to show the operator-facing number.
              </p>

              <div>
                <p class="ui-lab__subhead">Actors</p>
                <app-ui-cluster gap="sm">
                  <app-entity-chip type="actor" id="marvin" label="Marvin" />
                  <app-entity-chip type="actor" id="ralph"  label="Ralph"  />
                  <app-entity-chip type="actor" id="boris"  label="Boris"  />
                  <app-entity-chip type="actor" id="jimbo"  label="Jimbo"  />
                </app-ui-cluster>
              </div>

              <div>
                <p class="ui-lab__subhead">Projects</p>
                <app-ui-cluster gap="sm">
                  <app-entity-chip type="project" id="hermes"     label="Hermes"     />
                  <app-entity-chip type="project" id="localshout" label="Localshout" />
                  <app-entity-chip type="project" id="dashboard"  label="Dashboard"  />
                  <app-entity-chip type="project" id="personal"   label="Personal"   />
                </app-ui-cluster>
              </div>

              <div>
                <p class="ui-lab__subhead">Vault items (tasks)</p>
                <app-ui-cluster gap="sm">
                  <app-entity-chip type="vault-item" id="abc123" label="Add filter controls to event listing" [seq]="4252" />
                  <app-entity-chip type="vault-item" id="def456" label="Migrate auth middleware" [seq]="3891" />
                  <app-entity-chip type="vault-item" id="ghi789" label="No seq provided (fallback)" />
                </app-ui-cluster>
              </div>

              <div>
                <p class="ui-lab__subhead">Inline with text (typical mention context)</p>
                <p class="ui-lab__support-copy">
                  Assigned to <app-entity-chip type="actor" id="ralph" label="Ralph" /> via
                  <app-entity-chip type="project" id="hermes" label="Hermes" /> —
                  unblocks <app-entity-chip type="vault-item" id="abc123" label="Add filter controls" />.
                </p>
              </div>
            </app-ui-stack>
          </app-ui-section>

          <app-ui-section id="vault-detail-primitives" title="Vault Detail Primitives" [collapsible]="false">
            <app-ui-stack gap="md">
              <p class="ui-lab__support-copy">
                Building blocks used inside the vault item detail modal. Each is intentionally small
                so the modal can compose them and rearrange visually without cross-contamination.
              </p>

              <div>
                <p class="ui-lab__subhead">ui-stat-card</p>
                <p class="ui-lab__support-copy">
                  Label / value / detail triplet on a soft compact card. Used for the four overview
                  cards (origin, hierarchy, timeline, context).
                </p>
                <div class="ui-lab__stat-card-grid">
                  <app-ui-stat-card
                    label="Origin"
                    value="Manual · operator-intake"
                    detail="Operator-created intake."
                  />
                  <app-ui-stat-card
                    label="Hierarchy"
                    value="Sub-item of #963"
                    detail="Filter by Free, Covers"
                  />
                  <app-ui-stat-card
                    label="Timeline"
                    value="Added 24 Apr 01:25:27"
                    detail="Last change 29 Apr 00:14:19"
                  />
                  <app-ui-stat-card
                    label="Context"
                    value="Localshout"
                    detail="0 blockers · 0 open questions"
                  />
                </div>
              </div>

              <div>
                <p class="ui-lab__subhead">ui-chip-list</p>
                <p class="ui-lab__support-copy">
                  Removable chips with an inline add picker. Used for projects, blockers, and other
                  junction-table edges. Tone <code>blocker</code> tints the border red.
                </p>
                <app-ui-chip-list
                  [items]="labProjectChips()"
                  [pickerOptions]="labProjectPickerOptions"
                  addLabel="+ add project"
                  emptyLabel="no linked projects"
                  (added)="addLabProjectChip($event)"
                  (removed)="removeLabProjectChip($event)"
                />
                <app-ui-chip-list
                  [items]="labBlockerChips"
                  [alwaysShowAdd]="false"
                  addLabel="+ add blocker"
                  emptyLabel="no blockers"
                />
              </div>

              <div>
                <p class="ui-lab__subhead">ui-inline-picker</p>
                <p class="ui-lab__support-copy">
                  Listbox dropdown for selecting from a small set of options. Consumer owns the
                  trigger button and open/closed state.
                </p>
                <app-ui-cluster gap="sm" align="center">
                  <app-ui-badge tone="info">@boris</app-ui-badge>
                  <app-ui-button
                    size="sm"
                    variant="ghost"
                    ariaLabel="Reassign owner"
                    (pressed)="toggleLabReassign()">
                    {{ labReassignOpen() ? '▲' : '▼' }}
                  </app-ui-button>
                  @if (labReassignOpen()) {
                    <app-ui-inline-picker
                      ariaLabel="Select new owner"
                      [options]="labOwnerOptions"
                      (selected)="onLabReassign($event)"
                    />
                  }
                </app-ui-cluster>
                @if (labReassignedTo()) {
                  <p class="ui-lab__support-copy">Reassigned to: <strong>{{ labReassignedTo() }}</strong></p>
                }
              </div>

              <div>
                <p class="ui-lab__subhead">ui-dropdown</p>
                <p class="ui-lab__support-copy">
                  Slot-based dropdown with full a11y: <code>aria-expanded</code>,
                  <code>aria-controls</code>, Arrow / Home / End key navigation, Escape closes
                  and returns focus to trigger. The <code>[trigger]</code> slot is visual only —
                  the wrapper <code>&lt;button&gt;</code> is the interactive element.
                  The <code>[panel]</code> slot accepts any content.
                </p>
                <app-ui-cluster gap="md" align="center">
                  <app-ui-dropdown #statusDrop ariaHaspopup="listbox" ariaLabel="Change status">
                    <app-ui-badge
                      trigger
                      [tone]="labDropdownStatus() === 'active' ? 'success' : 'neutral'">
                      {{ labDropdownStatus() }} ▾
                    </app-ui-badge>
                    <div panel role="listbox" class="ui-lab__dropdown-panel">
                      @for (s of ['active', 'done']; track s) {
                        <button
                          class="ui-lab__dropdown-option"
                          role="option"
                          [attr.aria-selected]="labDropdownStatus() === s"
                          (click)="labDropdownStatus.set(s); statusDrop.close()">
                          <app-ui-badge [tone]="s === 'active' ? 'success' : 'neutral'">{{ s }}</app-ui-badge>
                        </button>
                      }
                    </div>
                  </app-ui-dropdown>

                  <app-ui-dropdown #ownerDrop ariaHaspopup="listbox" ariaLabel="Reassign owner">
                    <app-ui-badge trigger tone="info">&#64;{{ labDropdownOwner() }} ▾</app-ui-badge>
                    <div panel role="listbox" class="ui-lab__dropdown-panel">
                      @for (opt of labOwnerOptions; track opt.id) {
                        <button
                          class="ui-lab__dropdown-option"
                          role="option"
                          [attr.aria-selected]="labDropdownOwner() === opt.id"
                          (click)="labDropdownOwner.set(opt.id); ownerDrop.close()">
                          {{ opt.label }}
                        </button>
                      }
                    </div>
                  </app-ui-dropdown>
                </app-ui-cluster>
              </div>

              <div>
                <p class="ui-lab__subhead">ui-readiness-panel</p>
                <p class="ui-lab__support-copy">
                  Collapsible "X/Y checks passed" header with check list. Bound to the
                  <code>Readiness</code> domain shape.
                </p>
                <app-ui-readiness-panel [data]="sampleReadiness" />
              </div>

              <div>
                <p class="ui-lab__subhead">ui-checklist</p>
                <p class="ui-lab__support-copy">
                  Done/pending list with optional status chip per item. Used for acceptance criteria
                  with verbose / exceeds annotations.
                </p>
                <app-ui-checklist [items]="sampleChecklist" />
              </div>

              <div>
                <p class="ui-lab__subhead">ui-sticky-action-bar</p>
                <p class="ui-lab__support-copy">
                  Layout primitive for a sticky bottom action bar with a primary slot on the left and
                  a secondary group on the right. Contains its own spacer so consumers don't hand-roll
                  one. Buttons remain the consumer's choice.
                </p>
                <div class="ui-lab__sticky-demo">
                  <p class="ui-lab__support-copy">
                    Demo content above the bar — scroll the panel below to see it stick.
                  </p>
                  <p class="ui-lab__support-copy">
                    The primary slot gets one large button; the trailing group has reject / archive /
                    delete in a wrap-friendly cluster.
                  </p>
                  <p class="ui-lab__support-copy">
                    In a real modal these are the operator's main actions on the item.
                  </p>
                  <app-ui-sticky-action-bar>
                    <app-ui-button uiStickyActionBarPrimary variant="primary">edit</app-ui-button>
                    <app-ui-cluster uiStickyActionBarSecondary gap="sm">
                      <app-ui-button variant="secondary">reject</app-ui-button>
                      <app-ui-button variant="secondary">archive</app-ui-button>
                      <app-ui-button variant="danger">delete</app-ui-button>
                    </app-ui-cluster>
                  </app-ui-sticky-action-bar>
                </div>
              </div>

              <div>
                <p class="ui-lab__subhead">ui-subsection + ui-subhead</p>
                <p class="ui-lab__support-copy">
                  Smaller-grain bordered fieldset. Used inside the body for intake / delivery / links
                  columns. <code>ui-subhead</code> is the inline "label · count" used for groups
                  within a subsection.
                </p>
                <div class="ui-lab__subsection-stack">
                  <app-ui-subsection label="Intake" hint="(immutable input)">
                    <pre class="ui-lab__code-block"><code>Add filter controls to the LocalShout event listing view so users can toggle between Free entry events and events with a cover charge.</code></pre>
                  </app-ui-subsection>

                  <app-ui-subsection label="Links">
                    <app-ui-subhead label="Projects" [count]="1" />
                    <app-ui-cluster gap="sm">
                      <app-ui-badge tone="info">Localshout</app-ui-badge>
                    </app-ui-cluster>
                    <app-ui-subhead label="Blocked by" [count]="0" />
                    <p class="ui-lab__support-copy">no blockers</p>
                    <app-ui-subhead label="Tags" [count]="6" />
                    <app-ui-cluster gap="sm">
                      <app-ui-badge tone="neutral" [subtle]="true">localshout</app-ui-badge>
                      <app-ui-badge tone="neutral" [subtle]="true">feature</app-ui-badge>
                      <app-ui-badge tone="neutral" [subtle]="true">filter</app-ui-badge>
                      <app-ui-badge tone="neutral" [subtle]="true">frontend</app-ui-badge>
                      <app-ui-badge tone="neutral" [subtle]="true">events</app-ui-badge>
                      <app-ui-badge tone="neutral" [subtle]="true">ux</app-ui-badge>
                    </app-ui-cluster>
                  </app-ui-subsection>
                </div>
              </div>
            </app-ui-stack>
          </app-ui-section>

          <app-ui-section id="tab-bar" title="Tab Bar" [collapsible]="false">
            <app-ui-stack gap="md">

              <app-ui-meta-list>
                <dt>Component</dt>
                <dd><code>app-ui-tab-bar</code> — wraps a <code>nav</code> with the underline-tab border. Tabs are projected as <code>.ui-tab</code> elements (links or buttons).</dd>
                <dt>Active state</dt>
                <dd>Router tabs: <code>routerLinkActive="active"</code>. Signal tabs: <code>[class.active]="activeTab() === 'x'"</code>.</dd>
              </app-ui-meta-list>

              <div>
                <p class="ui-lab__subhead">Router-style (static demo)</p>
                <app-ui-tab-bar label="Demo navigation">
                  <a class="ui-tab active" href="#" (click)="$event.preventDefault()">Overview</a>
                  <a class="ui-tab" href="#" (click)="$event.preventDefault()">Detail</a>
                  <a class="ui-tab" href="#" (click)="$event.preventDefault()">Settings</a>
                </app-ui-tab-bar>
              </div>

              <div>
                <p class="ui-lab__subhead">Signal-based (functional)</p>
                <app-ui-tab-bar label="Signal tab demo">
                  <button type="button" class="ui-tab" [class.active]="labActiveTab() === 'overview'" (click)="labActiveTab.set('overview')">Overview</button>
                  <button type="button" class="ui-tab" [class.active]="labActiveTab() === 'detail'" (click)="labActiveTab.set('detail')">Detail</button>
                  <button type="button" class="ui-tab" [class.active]="labActiveTab() === 'settings'" (click)="labActiveTab.set('settings')">Settings</button>
                </app-ui-tab-bar>
                <div class="ui-lab__tab-content">
                  @switch (labActiveTab()) {
                    @case ('overview') { <p>Overview content — project list, summary stats.</p> }
                    @case ('detail') { <p>Detail content — expanded fields, related items.</p> }
                    @case ('settings') { <p>Settings content — configuration, permissions.</p> }
                  }
                </div>
              </div>

            </app-ui-stack>
          </app-ui-section>

          <app-ui-section id="list-workflow" title="Typical List Workflow" [collapsible]="false">
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
                        <td>{{ project.createdAt | datetime }}</td>
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

          <app-ui-section id="detail-workflow" title="Typical Detail Workflow" [collapsible]="false">
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

          <app-ui-section id="hybrid-edit" title="Hybrid Edit Demo" [collapsible]="false">
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

          <app-ui-section id="expandable-rows" title="Expandable Rows Inline" [collapsible]="false">
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

          <app-ui-section id="side-panel-inspector" title="Side-Panel Inspector" [collapsible]="false">
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

          <app-ui-section id="loading-states" title="Loading States" [collapsible]="false">
            <app-ui-stack gap="sm">
              <app-ui-loading-state label="Loading skills" message="Fetching skill registry." />
              <app-ui-loading-state label="Loading project activity" message="Refreshing recent activity." />
            </app-ui-stack>
          </app-ui-section>

          <app-ui-section id="datetime-pipes" title="Date &amp; Time Pipes" [collapsible]="false">
            <app-ui-stack gap="md">
              <app-ui-meta-list>
                <dt>datetime</dt>
                <dd><code>value | datetime</code> — ISO string → "2 May 14:18:00". Includes year when outside current year. Returns "—" for null/empty.</dd>
                <dt>relativeTime</dt>
                <dd><code>value | relativeTime</code> — ISO string → "5m ago", "in 2h", "just now". Returns "never" for null/empty.</dd>
              </app-ui-meta-list>

              <app-table-shell>
                <table class="ui-lab__table ui-lab__table--pipes">
                  <thead>
                    <tr>
                      <th>Raw ISO</th>
                      <th>datetime</th>
                      <th>relativeTime</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (sample of dateSamples; track sample.label) {
                      <tr>
                        <td><code>{{ sample.iso }}</code></td>
                        <td>{{ sample.iso | datetime }}</td>
                        <td>{{ sample.iso | relativeTime }}</td>
                      </tr>
                    }
                    <tr>
                      <td><code>null</code></td>
                      <td>{{ null | datetime }}</td>
                      <td>{{ null | relativeTime }}</td>
                    </tr>
                  </tbody>
                </table>
              </app-table-shell>
            </app-ui-stack>
          </app-ui-section>

          <app-ui-section id="form-actions" title="Form Actions" [collapsible]="false">
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
      </div>

    </div>
  `,
  styles: [`
    /* ── Layout ────────────────────────────────────────────────── */

    .ui-lab {
      display: grid;
      grid-template-columns: 13rem 1fr;
      align-items: start;
    }

    .ui-lab__sidenav {
      position: sticky;
      top: 8rem;
      max-height: calc(100vh - 9rem);
      overflow-y: auto;
      padding: 1.5rem 0 3rem;
      scrollbar-width: thin;
    }

    .ui-lab__sidenav-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .ui-lab__sidenav-link {
      display: block;
      padding: 0.35rem 0.75rem;
      font-size: 0.82rem;
      text-decoration: none;
      color: var(--color-text-muted);
      border-radius: var(--radius);
      border-left: 2px solid transparent;
      transition: color 120ms ease, background 120ms ease, border-color 120ms ease;

      &:hover {
        color: var(--color-text);
        background: var(--color-surface-soft, var(--color-surface));
        border-left-color: var(--color-border);
      }
    }

    .ui-lab__content {
      padding: 1.5rem 2rem 3rem 1rem;
      min-width: 0;
    }

    /* ── Component demos ───────────────────────────────────────── */

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
      margin: 0 0 0.5rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }

    .ui-lab__tab-content {
      padding: 1rem;
      border: 1px solid var(--color-border);
      border-top: none;
      font-size: 0.85rem;
      color: var(--color-text-muted);
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

    .ui-lab__stat-card-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.6rem;
    }

    .ui-lab__subsection-stack {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .ui-lab__dropdown-panel {
      display: flex;
      flex-direction: column;
    }

    .ui-lab__dropdown-option {
      padding: 0.4rem 0.8rem;
      background: none;
      border: none;
      border-bottom: 1px solid var(--color-border);
      font: inherit;
      font-size: 0.8rem;
      cursor: pointer;
      text-align: left;
      color: var(--color-text);

      &:last-child { border-bottom: none; }
      &:hover { background: var(--color-surface); }
      &[aria-selected='true'] {
        background: color-mix(in oklab, var(--color-accent) 8%, var(--color-bg));
      }
      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: -2px;
      }
    }

    .ui-lab__sticky-demo {
      max-height: 14rem;
      overflow-y: auto;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 0.75rem 0.75rem 0;
      background: var(--color-surface);
    }

    /* ── Responsive ────────────────────────────────────────────── */

    @media (max-width: 900px) {
      .ui-lab {
        grid-template-columns: 1fr;
      }

      .ui-lab__sidenav {
        position: sticky;
        top: 0;
        max-height: none;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 0.5rem 1rem;
        background: var(--color-bg);
        border-bottom: 1px solid var(--color-border);
        z-index: 10;
        scrollbar-width: none;
      }

      .ui-lab__sidenav-list {
        flex-direction: row;
        gap: 0.25rem;
        white-space: nowrap;
      }

      .ui-lab__sidenav-link {
        display: inline-block;
        border-left: none;
        border-bottom: 2px solid transparent;
        border-radius: 0;
        padding: 0.3rem 0.5rem;

        &:hover {
          border-left-color: transparent;
          border-bottom-color: var(--color-border);
        }
      }

      .ui-lab__content {
        padding: 1rem 1rem 2rem;
      }

      .ui-lab__inline-field {
        flex-direction: column;
      }

      .ui-lab__inspector-layout {
        grid-template-columns: 1fr;
      }

      .ui-lab__stat-card-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class UiLabPage {
  protected readonly registry = componentRegistry;

  protected readonly sampleProjects: readonly LabProjectRow[] = [
    { id: 'hermes', displayName: 'Hermes', status: 'active', owner: '@marvin', createdAt: '2026-04-12T09:00:00.000Z' },
    { id: 'dashboard', displayName: 'Dashboard', status: 'active', owner: '@ralph', createdAt: '2026-04-18T14:32:00.000Z' },
    { id: 'localshout', displayName: 'Localshout', status: 'archived', owner: '@boris', createdAt: '2026-03-04T11:15:00.000Z' },
  ];
  protected readonly sampleMail: readonly LabMailRow[] = [
    {
      id: 'mail-001',
      from: 'Sarah Chen',
      subject: 'Speaker shortlist for Q3 offsite',
      decision: 'undecided',
      receivedAt: '2026-04-29T09:14:00.000Z',
      summary: 'Needs a quick operator decision on whether to pursue two shortlisted speakers.',
      body: 'Sarah shared two speaker options, budget notes, and a suggested follow-up by Friday.',
    },
    {
      id: 'mail-002',
      from: 'OpenRouter',
      subject: 'April usage summary and rate changes',
      decision: 'gem',
      receivedAt: '2026-04-29T13:42:00.000Z',
      summary: 'Contains pricing changes that likely affect model tracking and operator guidance.',
      body: 'Usage summary includes candidate model pricing adjustments and a note about deprecations.',
    },
    {
      id: 'mail-003',
      from: 'Notion',
      subject: 'Weekly digest',
      decision: 'archive',
      receivedAt: '2026-04-30T07:05:00.000Z',
      summary: 'Routine digest with no immediate action required.',
      body: 'Digest contains workspace highlights, trending documents, and reminder suggestions.',
    },
  ];

  protected readonly labToggle = signal(false);

  protected readonly labProjectChipsState = signal<readonly UiChipListItem[]>([
    { id: 'localshout', label: 'Localshout' },
  ]);
  protected readonly labProjectChips = this.labProjectChipsState.asReadonly();
  protected readonly labProjectPickerOptions: readonly UiChipListPickerOption[] = [
    { id: 'hermes', label: 'Hermes' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'jimbo', label: 'Jimbo' },
  ];
  protected readonly labBlockerChips: readonly UiChipListItem[] = [
    { id: '1820', label: '#1820 · Migrate to Postgres', tone: 'blocker' },
  ];
  protected readonly labOwnerOptions: readonly UiInlinePickerOption[] = [
    { id: 'marvin', label: '@marvin', selected: false },
    { id: 'boris', label: '@boris', selected: true },
    { id: 'ralph', label: '@ralph', selected: false },
  ];
  protected readonly labReassignOpen = signal(false);
  protected readonly labReassignedTo = signal<string | null>(null);

  protected readonly labDropdownStatus = signal<string>('active');
  protected readonly labDropdownOwner = signal<string>(
    this.labOwnerOptions.find(o => o.selected)?.id ?? this.labOwnerOptions[0].id
  );

  toggleLabReassign(): void {
    this.labReassignOpen.update(v => !v);
  }

  onLabReassign(id: string): void {
    this.labReassignedTo.set(id);
    this.labReassignOpen.set(false);
  }

  addLabProjectChip(id: string): void {
    const opt = this.labProjectPickerOptions.find(o => o.id === id);
    if (!opt) return;
    this.labProjectChipsState.update(items => {
      if (items.some(i => i.id === id)) return items;
      return [...items, { id: opt.id, label: opt.label }];
    });
  }

  removeLabProjectChip(id: string): void {
    this.labProjectChipsState.update(items => items.filter(i => i.id !== id));
  }

  protected readonly sampleReadiness: UiReadinessData = {
    passed: 3,
    total: 4,
    verdict: 'not_ready',
    checks: [
      { key: 'acceptance_criteria', label: 'Acceptance criteria set', ok: true, blocker: null },
      { key: 'assigned', label: 'Owner assigned', ok: true, blocker: null },
      { key: 'priority', label: 'Priority scored', ok: true, blocker: null },
      { key: 'grooming_complete', label: 'Grooming complete', ok: false, blocker: 'currently classified' },
    ],
  };

  protected readonly sampleChecklist: readonly UiChecklistItem[] = [
    {
      text: 'Acceptance criteria set',
      done: true,
    },
    {
      text: 'Owner assigned',
      done: true,
    },
    {
      text: 'Event listings can be filtered by Free and Covers. Filter controls are visible from the main event view. Filtering updates results dynamically. Both filter states can be active simultaneously or toggled independently.',
      done: false,
      status: { label: 'exceeds', tone: 'err', title: 'Exceeds policy. Reject or edit.' },
    },
    {
      text: 'Tracks user filter selection in URL state for shareable links',
      done: false,
      status: { label: 'verbose', tone: 'warn', title: 'Verbose. Spec recommends ≤ 120 chars.' },
    },
  ];

  protected readonly dateSamples: readonly { label: string; iso: string }[] = [
    { label: 'recent', iso: new Date(Date.now() - 3 * 60_000).toISOString() },
    { label: 'today', iso: new Date(Date.now() - 2 * 3_600_000).toISOString() },
    { label: 'yesterday', iso: new Date(Date.now() - 26 * 3_600_000).toISOString() },
    { label: 'this year', iso: '2026-02-15T08:30:00.000Z' },
    { label: 'past year', iso: '2024-11-03T17:45:22.000Z' },
  ];

  readonly labActiveTab = signal<'overview' | 'detail' | 'settings'>('overview');

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
