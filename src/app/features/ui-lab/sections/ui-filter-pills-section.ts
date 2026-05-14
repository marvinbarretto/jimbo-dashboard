import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { UiFilterPills, type UiFilterPillOption } from '@shared/components/ui-filter-pills/ui-filter-pills';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-ui-filter-pills-section',
  imports: [UiFilterPills, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Filter Pills" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Multi-select pill row. Each pill toggles independently — the host owns
          the active-set semantics (including exclusive cases like "all" wiping
          the others). Distinct from <code>app-ui-segmented</code>, which is
          single-select one-of-N. Use pills for filters; use segmented for view modes.
        </p>

        <div>
          <p class="ui-lab__subhead">Activity-log filters (exclusive "all")</p>
          <app-ui-filter-pills
            [options]="activityOptions"
            [active]="activityActiveList()"
            ariaLabel="activity event filters"
            (toggled)="toggleActivity($event)"
          />
          <p class="ui-lab__support-copy" style="margin-top:.5rem">
            Active: <code>{{ activityActiveList().join(', ') }}</code>
          </p>
        </div>

        <div>
          <p class="ui-lab__subhead">With counts (free toggle)</p>
          <app-ui-filter-pills
            [options]="countedOptions"
            [active]="countedActiveList()"
            ariaLabel="vault item filters"
            (toggled)="toggleCounted($event)"
          />
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class UiFilterPillsSection {
  protected readonly activityOptions: readonly UiFilterPillOption[] = [
    { value: 'all',        label: 'all'        },
    { value: 'status',     label: 'status'     },
    { value: 'agent',      label: 'agent'      },
    { value: 'assignment', label: 'assignment' },
    { value: 'thread',     label: 'thread'     },
  ];
  protected readonly countedOptions: readonly UiFilterPillOption[] = [
    { value: 'task',   label: 'task',   count: 32 },
    { value: 'note',   label: 'note',   count: 9  },
    { value: 'idea',   label: 'idea',   count: 14 },
    { value: 'rework', label: 'rework', count: 3  },
  ];

  protected readonly activityActive = signal<ReadonlySet<string>>(new Set(['all']));
  protected readonly activityActiveList = computed(() => Array.from(this.activityActive()));

  protected readonly countedActive = signal<ReadonlySet<string>>(new Set(['task']));
  protected readonly countedActiveList = computed(() => Array.from(this.countedActive()));

  toggleActivity(key: string): void {
    this.activityActive.update(set => {
      const next = new Set(set);
      if (key === 'all') return new Set(['all']);
      next.delete('all');
      if (next.has(key)) next.delete(key); else next.add(key);
      if (next.size === 0) return new Set(['all']);
      return next;
    });
  }

  toggleCounted(key: string): void {
    this.countedActive.update(set => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
}
