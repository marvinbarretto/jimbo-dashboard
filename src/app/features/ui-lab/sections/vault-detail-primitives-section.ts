import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiChecklist, type UiChecklistItem } from '@shared/components/ui-checklist/ui-checklist';
import { UiChipList, type UiChipListItem, type UiChipListPickerOption } from '@shared/components/ui-chip-list/ui-chip-list';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiDropdown } from '@shared/components/ui-dropdown/ui-dropdown';
import { UiInlinePicker, type UiInlinePickerOption } from '@shared/components/ui-inline-picker/ui-inline-picker';
import { UiReadinessPanel, type UiReadinessData } from '@shared/components/ui-readiness-panel/ui-readiness-panel';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiStickyActionBar } from '@shared/components/ui-sticky-action-bar/ui-sticky-action-bar';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';

@Component({
  selector: 'app-vault-detail-primitives-section',
  imports: [
    UiBadge, UiButton, UiChecklist, UiChipList, UiCluster, UiDropdown,
    UiInlinePicker, UiReadinessPanel, UiSection, UiStack, UiStatCard,
    UiStickyActionBar, UiSubhead, UiSubsection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Vault Detail Primitives" [collapsible]="false">
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
            <app-ui-stat-card label="Origin"    value="Manual · operator-intake"   detail="Operator-created intake." />
            <app-ui-stat-card label="Hierarchy" value="Sub-item of #963"           detail="Filter by Free, Covers" />
            <app-ui-stat-card label="Timeline"  value="Added 24 Apr 01:25:27"      detail="Last change 29 Apr 00:14:19" />
            <app-ui-stat-card label="Context"   value="Localshout"                 detail="0 blockers · 0 open questions" />
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
  `,
})
export class VaultDetailPrimitivesSection {
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
    { text: 'Acceptance criteria set', done: true },
    { text: 'Owner assigned', done: true },
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
}
