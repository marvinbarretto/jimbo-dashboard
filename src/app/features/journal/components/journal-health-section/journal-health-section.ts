import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { formatMinutes } from '@shared/utils/datetime.utils';
import type { TelemetryEventLite } from '../../data-access/journal-data.service';
import { dedupeWindowedSum } from '../../utils/windowed-telemetry';

/**
 * Health Connect rollup for one day's telemetry: steps/distance/energy/floors
 * plus exercise sessions and phone movement transitions. Pure over the
 * `events` input — the owning page supplies the day bundle's telemetry.
 */
@Component({
  selector: 'app-journal-health-section',
  imports: [DecimalPipe, UiEmptyState, UiSection, UiStack, UiStatCard, UiSubhead],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-health-section.html',
  styleUrl: '../../journal-sections.scss',
})
export class JournalHealthSection {
  readonly events = input.required<readonly TelemetryEventLite[]>();

  protected readonly formatMinutes = formatMinutes;

  protected readonly summary = computed(() => {
    const events = this.events().filter(e => e.collector === 'health_connect');
    if (!events.length) return null;

    // HC aggregates share the phone's rolling-2h-window emission pattern —
    // same dedupe as screen_session, or a 7k-step day reads as 26k.
    const sum = (type: string) =>
      dedupeWindowedSum(events.filter(e => e.type === type), e => e.value ?? 0);

    const steps = Math.round(sum('steps'));
    const distanceKm = sum('distance') / 1000;
    // Health Connect emits `calories_total` (total daily burn), not a
    // `calories_active` type — summing the latter always yielded 0.
    const energyKcal = Math.round(sum('calories_total'));
    const floors = Math.round(sum('floors'));

    const exercises = events
      .filter(e => e.type === 'exercise_session')
      .map(e => ({
        type: e.payload?.['exercise_type'] as string ?? 'exercise',
        durationMin: Math.round(e.value ?? 0),
        ts: e.ts,
      }))
      .sort((a, b) => a.ts.localeCompare(b.ts));

    return { steps, distanceKm, energyKcal, floors, exercises };
  });

  // Movement — enter transitions only, skip 'still' (the baseline, not an
  // event worth counting).
  protected readonly movementRows = computed<Array<[string, number]>>(() => {
    const movMap = new Map<string, number>();
    for (const e of this.events().filter(e => e.collector === 'activity')) {
      if ((e.payload?.['transition'] as string) === 'enter') {
        const t = e.payload?.['activity_type'] as string ?? 'unknown';
        if (t !== 'still') movMap.set(t, (movMap.get(t) ?? 0) + 1);
      }
    }
    return [...movMap.entries()].sort((a, b) => b[1] - a[1]);
  });

  protected readonly meta = computed(() => this.summary() ? 'From Health Connect' : 'No data');

  protected readonly open = linkedSignal(() => this.summary() != null);
}
