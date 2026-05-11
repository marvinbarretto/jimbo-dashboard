import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButtonLink } from '@shared/components/ui-button-link/ui-button-link';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiInlineEdit, type UiInlineEditOption } from '@shared/components/ui-inline-edit/ui-inline-edit';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

type LabProjectStatus = 'active' | 'archived';

// Canonical reference for the hybrid edit pattern:
// scalar fields (name, description, status) edit in place; complex/validated
// fields (criteria, color, URLs) route to the advanced edit form.
@Component({
  selector: 'app-hybrid-edit-section',
  imports: [UiBadge, UiButtonLink, UiCluster, UiInlineEdit, UiMetaList, UiPageHeader, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Hybrid Edit — project detail pattern" [collapsible]="false">
      <app-ui-stack gap="lg">
        <p class="ui-lab__copy">
          Scalar fields edit in place via <code>UiInlineEdit</code> — no save/cancel buttons,
          no separate edit route. Complex or validation-heavy fields stay in the advanced edit form.
          This mirrors how the project landing page works in production.
        </p>

        <app-ui-page-header>
          <div uiPageHeaderTitle class="ui-lab__hybrid-title">
            <app-ui-badge [tone]="projectStatus() === 'active' ? 'success' : 'neutral'">
              {{ projectStatus() }}
            </app-ui-badge>
            <app-ui-inline-edit
              class="ui-lab__inline-grow"
              [value]="projectTitle()"
              size="lg"
              ariaLabel="Edit project name"
              (saved)="onNameSaved($event)"
            />
          </div>
          <app-ui-button-link uiPageHeaderActions routerLink="/config/projects/hermes/edit" variant="secondary">
            Advanced edit
          </app-ui-button-link>
        </app-ui-page-header>

        <app-ui-stack gap="sm">
          <div class="ui-lab__inline-field">
            <span class="ui-lab__inline-label">Description</span>
            <app-ui-inline-edit
              class="ui-lab__inline-grow"
              [value]="projectDescription()"
              kind="textarea"
              placeholder="Add a description…"
              ariaLabel="Edit description"
              [rows]="3"
              (saved)="projectDescription.set($event)"
            />
          </div>

          <div class="ui-lab__inline-field">
            <span class="ui-lab__inline-label">Status</span>
            <app-ui-inline-edit
              class="ui-lab__inline-grow"
              [value]="projectStatus()"
              kind="select"
              [options]="statusOptions"
              [displayFor]="statusLabel"
              ariaLabel="Edit status"
              (saved)="onStatusSaved($event)"
            />
          </div>
        </app-ui-stack>

        <app-ui-stack gap="md">
          <h3 class="ui-lab__subhead">Fields that stay in advanced edit</h3>
          <app-ui-meta-list>
            <dt>Criteria</dt>
            <dd>Long markdown — validation-heavy, better handled on a full form screen.</dd>
            <dt>Repo URL</dt>
            <dd>Editable, but often paired with validation and related metadata.</dd>
            <dt>Compound settings</dt>
            <dd>Color token, pricing groups, structured workflow rules.</dd>
          </app-ui-meta-list>

          <pre class="ui-lab__code-block"><code>{{ criteriaPreview() }}</code></pre>

          <app-ui-button-link routerLink="/config/projects/hermes/edit" variant="secondary">Advanced edit</app-ui-button-link>
        </app-ui-stack>

        <app-ui-cluster gap="sm">
          <span class="ui-lab__inline-label">Live values:</span>
          <code>title="{{ projectTitle() }}"</code>
          <code>status="{{ projectStatus() }}"</code>
        </app-ui-cluster>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class HybridEditSection {
  protected readonly projectTitle = signal('Hermes');
  protected readonly projectStatus = signal<LabProjectStatus>('active');
  protected readonly projectDescription = signal('');

  protected readonly statusOptions: UiInlineEditOption[] = [
    { value: 'active',   label: 'Active' },
    { value: 'archived', label: 'Archived' },
  ];

  protected readonly statusLabel = (v: string): string =>
    this.statusOptions.find(o => o.value === v)?.label ?? v;

  protected readonly criteriaPreview = computed(() => [
    '# Hermes criteria',
    '',
    '- Keep operator flows inspectable.',
    '- Bias toward fast triage and explicit ownership.',
    '- Preserve escape hatches for advanced edits.',
  ].join('\n'));

  onNameSaved(value: string): void {
    const trimmed = value.trim();
    if (trimmed) this.projectTitle.set(trimmed);
  }

  onStatusSaved(value: string): void {
    this.projectStatus.set(value as LabProjectStatus);
  }
}
