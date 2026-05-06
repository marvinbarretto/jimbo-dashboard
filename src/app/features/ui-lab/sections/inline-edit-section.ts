import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UiInlineEdit } from '@shared/components/ui-inline-edit/ui-inline-edit';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';

const STATUSES = [
  { value: 'active',   label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'paused',   label: 'Paused' },
];

@Component({
  selector: 'app-inline-edit-section',
  imports: [UiInlineEdit, UiSection, UiStack, UiCluster],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Inline Edit" [collapsible]="false">
      <app-ui-stack gap="lg">
        <p class="ui-lab__copy">
          Click-to-edit primitive. Reads as text; activates with click, Enter, or Space;
          autofocuses + selects-all; saves on Enter or blur; cancels on Escape.
          Three render shapes: <code>text</code>, <code>textarea</code>, <code>select</code>.
        </p>

        <div class="ui-lab__inline-field">
          <span class="ui-lab__inline-label">Title (text, lg)</span>
          <app-ui-inline-edit
            class="ui-lab__inline-grow"
            [value]="title()"
            size="lg"
            ariaLabel="Edit title"
            (saved)="title.set($event)"
          />
        </div>

        <div class="ui-lab__inline-field">
          <span class="ui-lab__inline-label">Description (textarea)</span>
          <app-ui-inline-edit
            class="ui-lab__inline-grow"
            [value]="description()"
            kind="textarea"
            placeholder="Click to add a description…"
            ariaLabel="Edit description"
            [rows]="3"
            (saved)="description.set($event)"
          />
        </div>

        <div class="ui-lab__inline-field">
          <span class="ui-lab__inline-label">Status (select)</span>
          <app-ui-inline-edit
            class="ui-lab__inline-grow"
            [value]="status()"
            kind="select"
            ariaLabel="Edit status"
            [options]="statuses"
            [displayFor]="statusLabel"
            (saved)="status.set($event)"
          />
        </div>

        <app-ui-cluster gap="sm">
          <span class="ui-lab__inline-label">Live values:</span>
          <code>title="{{ title() }}"</code>
          <code>status="{{ status() }}"</code>
        </app-ui-cluster>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class InlineEditSection {
  protected readonly title = signal('Wire up the unified vault dialog');
  protected readonly description = signal('');
  protected readonly status = signal('active');
  protected readonly statuses = STATUSES;
  protected readonly statusLabel = (v: string): string =>
    STATUSES.find(s => s.value === v)?.label ?? v;
}
