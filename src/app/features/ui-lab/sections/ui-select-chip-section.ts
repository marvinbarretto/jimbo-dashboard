import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UiSelectChip } from '@shared/components/ui-select-chip/ui-select-chip';
import { ProjectAvatar } from '@shared/components/project-avatar/project-avatar';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiSection } from '@shared/components/ui-section/ui-section';

interface Demo { readonly id: string; readonly name: string; readonly color: string; }

@Component({
  selector: 'app-ui-select-chip-section',
  imports: [UiSelectChip, ProjectAvatar, UiStack, UiSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Select Chip" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          A prominent, selectable pill for picker UIs — bigger than the inline
          display chips. Carries a <code>selected</code> state + <code>toggle</code>
          output, an optional accent <code>color</code>, and a <code>[chipLead]</code>
          slot for an avatar / swatch / icon. Fills the gap between
          <code>app-chip</code> (coloured, not a picker) and
          <code>ui-filter-pills</code> (a picker, no colour).
        </p>

        <div>
          <p class="ui-lab__subhead">Single-select (project picker)</p>
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem">
            @for (p of demos; track p.id) {
              <app-ui-select-chip
                [label]="p.name"
                [color]="p.color"
                [selected]="selected() === p.id"
                (toggle)="selected.set(selected() === p.id ? null : p.id)">
                <app-project-avatar chipLead size="sm" variant="filled" [name]="p.name" [color]="p.color" />
              </app-ui-select-chip>
            }
            <app-ui-select-chip
              label="No project"
              [selected]="selected() === '__none'"
              (toggle)="selected.set(selected() === '__none' ? null : '__none')" />
          </div>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class UiSelectChipSection {
  protected readonly demos: readonly Demo[] = [
    { id: 'a', name: 'LocalShout', color: '#3b82f6' },
    { id: 'b', name: 'Box Box', color: '#ef4444' },
    { id: 'c', name: 'Jimbo', color: '#a78bfa' },
  ];
  protected readonly selected = signal<string | null>('a');
}
