import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UiInlineTabs, type UiInlineTabOption } from '@shared/components/ui-inline-tabs/ui-inline-tabs';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-ui-inline-tabs-section',
  imports: [UiInlineTabs, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Inline Tabs" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Lightweight in-page tabs for facet-switching inside a content section
          (e.g. "Epics by project" → per-project list). Underline-active style,
          no chrome. Distinct from <code>app-ui-tab-bar</code> which is the
          sticky page-level nav (full-width, section-accent backed).
          For multi-select use <code>app-ui-filter-pills</code>;
          for two- or three-way mode toggles use <code>app-ui-segmented</code>.
        </p>

        <div>
          <p class="ui-lab__subhead">Plain</p>
          <app-ui-inline-tabs
            [options]="plainOptions"
            [value]="plain()"
            ariaLabel="demo plain tabs"
            (changed)="plain.set($event)"
          />
          <p class="ui-lab__support-copy" style="margin-top:.5rem">
            Selected: <code>{{ plain() }}</code>
          </p>
        </div>

        <div>
          <p class="ui-lab__subhead">With counts</p>
          <app-ui-inline-tabs
            [options]="countOptions"
            [value]="counted()"
            ariaLabel="demo counted tabs"
            (changed)="counted.set($event)"
          />
        </div>

        <div>
          <p class="ui-lab__subhead">With colour dots + counts (mimics projects list)</p>
          <app-ui-inline-tabs
            [options]="projectOptions"
            [value]="project()"
            ariaLabel="demo project tabs"
            (changed)="project.set($event)"
          />
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class UiInlineTabsSection {
  protected readonly plainOptions: readonly UiInlineTabOption[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'detail',   label: 'Detail'   },
    { value: 'settings', label: 'Settings' },
  ];
  protected readonly countOptions: readonly UiInlineTabOption[] = [
    { value: 'all',    label: 'All',    count: 25 },
    { value: 'active', label: 'Active', count: 18 },
    { value: 'done',   label: 'Done',   count: 7  },
  ];
  protected readonly projectOptions: readonly UiInlineTabOption[] = [
    { value: '__all',       label: 'All',          count: 25 },
    { value: 'jimbo',       label: 'Jimbo',        count: 7, dotColor: '#7a8fc4' },
    { value: 'localshout',  label: 'LocalShout',   count: 7, dotColor: '#c47a8f' },
    { value: 'reinvent-me', label: 'Reinvent-Me',  count: 7, dotColor: '#7ac4a4' },
    { value: 'spoonscount', label: 'Spoonscount',  count: 2, dotColor: '#c4a47a' },
    { value: 'gym-app',     label: 'Gym App',      count: 1, dotColor: '#a47ac4' },
    { value: '__unlinked',  label: 'Unlinked',     count: 1 },
  ];

  protected readonly plain = signal<string>('overview');
  protected readonly counted = signal<string>('all');
  protected readonly project = signal<string>('__all');
}
