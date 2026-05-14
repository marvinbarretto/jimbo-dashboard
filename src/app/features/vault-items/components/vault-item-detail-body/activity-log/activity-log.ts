import { Component, ChangeDetectionStrategy, input, signal, computed } from '@angular/core';
import type { VaultActivityEvent } from '@domain/activity/activity-event';
import { UiFilterPills, type UiFilterPillOption } from '@shared/components/ui-filter-pills/ui-filter-pills';
import { UiSegmented, type UiSegmentedOption } from '@shared/components/ui-segmented/ui-segmented';
import { EventLineComponent } from './event-line/event-line';
import { loadVerbosity, saveVerbosity, type VerbosityLevel } from './verbosity';

type FilterKey = 'all' | 'status' | 'agent' | 'assignment' | 'thread';

const VERBOSITY_OPTIONS: readonly UiSegmentedOption[] = [
  { value: 'compact',  label: 'compact'  },
  { value: 'detailed', label: 'detailed' },
  { value: 'debug',    label: 'debug'    },
];

const FILTER_OPTIONS: readonly UiFilterPillOption[] = [
  { value: 'all',        label: 'all'        },
  { value: 'status',     label: 'status'     },
  { value: 'agent',      label: 'agent'      },
  { value: 'assignment', label: 'assignment' },
  { value: 'thread',     label: 'thread'     },
];

@Component({
  selector: 'app-activity-log',
  imports: [EventLineComponent, UiFilterPills, UiSegmented],
  templateUrl: './activity-log.html',
  styleUrl: './activity-log.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityLogComponent {
  readonly events     = input.required<readonly VaultActivityEvent[]>();
  readonly actorLabel = input<(id: string) => string>(a => a);
  readonly actorKind  = input<(id: string) => 'human' | 'agent' | 'system'>(() => 'system');

  readonly verbosity     = signal<VerbosityLevel>(loadVerbosity());
  readonly activeFilters = signal<Set<FilterKey>>(new Set(['all']));

  readonly verbosityOptions = VERBOSITY_OPTIONS;
  readonly filterOptions = FILTER_OPTIONS;

  readonly activeFilterList = computed(() => Array.from(this.activeFilters()));

  readonly visibleEvents = computed(() => {
    const filters = this.activeFilters();
    if (filters.has('all') || filters.size === 0) return this.events();
    return this.events().filter(e => {
      if (filters.has('status')     && (e.type === 'grooming_status_changed' || e.type === 'rejected')) return true;
      if (filters.has('agent')      && e.type === 'agent_run_completed') return true;
      if (filters.has('assignment') && e.type === 'assigned') return true;
      if (filters.has('thread')     && e.type === 'thread_message_posted') return true;
      return false;
    });
  });

  setVerbosity(v: string): void {
    const level = v as VerbosityLevel;
    this.verbosity.set(level);
    saveVerbosity(level);
  }

  toggleFilter(key: string): void {
    const k = key as FilterKey;
    this.activeFilters.update(set => {
      const next = new Set(set);
      if (k === 'all') return new Set<FilterKey>(['all']);
      next.delete('all');
      if (next.has(k)) next.delete(k); else next.add(k);
      if (next.size === 0) return new Set<FilterKey>(['all']);
      return next;
    });
  }
}
