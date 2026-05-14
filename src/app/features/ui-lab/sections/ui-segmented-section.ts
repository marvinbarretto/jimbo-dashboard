import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiSegmented, type UiSegmentedOption } from '@shared/components/ui-segmented/ui-segmented';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-ui-segmented-section',
  imports: [UiSection, UiSegmented, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Segmented Control" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Single-select one-of-N control. Use for view-mode toggles where exactly one option
          is always active (verbosity levels, message kinds, view densities). For multi-select
          filter pills, use <code>app-ui-filter-pills</code> instead (different visual: rounded
          pill, distinct gaps).
        </p>

        <div>
          <p class="ui-lab__subhead">Verbosity (3 options)</p>
          <app-ui-segmented
            [options]="verbosityOptions"
            [value]="verbosity()"
            ariaLabel="log verbosity"
            (changed)="verbosity.set($event)"
          />
          <p class="ui-lab__support-copy" style="margin-top:.5rem">
            Selected: <code>{{ verbosity() }}</code>
          </p>
        </div>

        <div>
          <p class="ui-lab__subhead">Message kind (3 options)</p>
          <app-ui-segmented
            [options]="kindOptions"
            [value]="kind()"
            ariaLabel="message kind"
            (changed)="kind.set($event)"
          />
          <p class="ui-lab__support-copy" style="margin-top:.5rem">
            Selected: <code>{{ kind() }}</code>
          </p>
        </div>

        <div>
          <p class="ui-lab__subhead">Two options</p>
          <app-ui-segmented
            [options]="binaryOptions"
            [value]="binary()"
            ariaLabel="density"
            (changed)="binary.set($event)"
          />
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class UiSegmentedSection {
  protected readonly verbosityOptions: readonly UiSegmentedOption[] = [
    { value: 'compact',  label: 'compact'  },
    { value: 'detailed', label: 'detailed' },
    { value: 'debug',    label: 'debug'    },
  ];
  protected readonly kindOptions: readonly UiSegmentedOption[] = [
    { value: 'comment',  label: 'comment'  },
    { value: 'question', label: 'question' },
    { value: 'answer',   label: 'answer'   },
  ];
  protected readonly binaryOptions: readonly UiSegmentedOption[] = [
    { value: 'cosy',    label: 'cosy'    },
    { value: 'compact', label: 'compact' },
  ];

  protected readonly verbosity = signal<string>('compact');
  protected readonly kind = signal<string>('comment');
  protected readonly binary = signal<string>('cosy');
}
