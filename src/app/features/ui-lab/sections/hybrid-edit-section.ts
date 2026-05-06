import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiFormActions } from '@shared/components/ui-form-actions/ui-form-actions';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

type LabProjectStatus = 'active' | 'archived';
type LabField = 'none' | 'title' | 'status';

@Component({
  selector: 'app-hybrid-edit-section',
  imports: [RouterLink, UiBadge, UiButton, UiCluster, UiFormActions, UiMetaList, UiPageHeader, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
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
  `,
})
export class HybridEditSection {
  protected readonly projectTitle = signal('Hermes');
  protected readonly projectStatus = signal<LabProjectStatus>('active');
  protected readonly draftTitle = signal(this.projectTitle());
  protected readonly draftStatus = signal<LabProjectStatus>(this.projectStatus());
  protected readonly editingField = signal<LabField>('none');

  protected readonly hasUnsavedChanges = computed(() =>
    this.projectTitle() !== 'Hermes' || this.projectStatus() !== 'active'
  );

  protected readonly criteriaPreview = computed(() => [
    '# Hermes criteria',
    '',
    '- Keep operator flows inspectable.',
    '- Bias toward fast triage and explicit ownership.',
    '- Preserve escape hatches for advanced edits.',
  ].join('\n'));

  startEditing(field: Exclude<LabField, 'none'>): void {
    this.editingField.set(field);
    if (field === 'title') this.draftTitle.set(this.projectTitle());
    if (field === 'status') this.draftStatus.set(this.projectStatus());
  }

  cancelEdit(): void {
    this.editingField.set('none');
    this.draftTitle.set(this.projectTitle());
    this.draftStatus.set(this.projectStatus());
  }

  saveTitle(): void {
    const next = this.draftTitle().trim();
    if (!next) return;
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
}
