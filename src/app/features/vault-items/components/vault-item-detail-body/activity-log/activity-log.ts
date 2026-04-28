import { Component, ChangeDetectionStrategy, input, signal, computed } from '@angular/core';
import type { VaultActivityEvent } from '@domain/activity/activity-event';
import { EventLineComponent } from './event-line/event-line';
import { VerbosityToggleComponent } from './verbosity-toggle/verbosity-toggle';
import { loadVerbosity, saveVerbosity, type VerbosityLevel } from './verbosity';

type FilterKey = 'all' | 'status' | 'agent' | 'assignment' | 'thread';

@Component({
  selector: 'app-activity-log',
  imports: [EventLineComponent, VerbosityToggleComponent],
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

  setVerbosity(v: VerbosityLevel): void {
    this.verbosity.set(v);
    saveVerbosity(v);
  }

  toggleFilter(key: FilterKey): void {
    this.activeFilters.update(set => {
      const next = new Set(set);
      if (key === 'all') return new Set(['all']);
      next.delete('all');
      if (next.has(key)) next.delete(key); else next.add(key);
      if (next.size === 0) return new Set(['all']);
      return next;
    });
  }

  isActive(key: FilterKey): boolean { return this.activeFilters().has(key); }
}
