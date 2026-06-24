import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { SessionDetailed } from '../../data-access/exercise.service';
import { groupSetsByExercise, londonTime, sessionStats } from '../../utils/exercise-format';

// Presentational: renders one session's raw captured data — grouped strength
// sets and cardio entries. No editing, no derived scoring (that's a later pass).
@Component({
  selector: 'app-exercise-session-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="xsc">
      <div class="xsc__head">
        <span class="xsc__time">{{ time() }}</span>
        <span class="xsc__meta">{{ meta() }}</span>
      </div>

      @if (groups().length) {
        <ul class="xsc__list">
          @for (g of groups(); track g.name) {
            <li class="xsc__row">
              <span class="xsc__ex">{{ g.name }}</span>
              <span class="xsc__sets">
                @for (s of g.sets; track $index) {
                  <span class="xsc__set">
                    {{ s.reps ?? '?' }}&times;{{ s.weight_kg ?? 0 }}kg@if (s.rpe) {<span class="xsc__rpe"> · RPE {{ s.rpe }}</span>}
                  </span>
                }
              </span>
            </li>
          }
        </ul>
      }

      @if (session().cardio.length) {
        <ul class="xsc__list">
          @for (c of session().cardio; track c.id) {
            <li class="xsc__row">
              <span class="xsc__ex">{{ c.exercise_name ?? c.exercise_id }}</span>
              <span class="xsc__sets">
                <span class="xsc__set">{{ cardioLabel(c.duration_s, c.distance_km, c.avg_heart_rate) }}</span>
              </span>
            </li>
          }
        </ul>
      }

      @if (session().notes) {
        <p class="xsc__notes">{{ session().notes }}</p>
      }
    </div>
  `,
  styles: [`
    .xsc { display: flex; flex-direction: column; gap: 0.35rem; }
    .xsc__head { display: flex; gap: 0.6rem; align-items: baseline; justify-content: space-between; }
    .xsc__time { color: var(--color-text); font-weight: 600; font-variant-numeric: tabular-nums; }
    .xsc__meta { color: var(--color-text-muted); font-size: 0.75rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .xsc__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
    .xsc__row { display: flex; gap: 0.6rem; align-items: baseline; justify-content: space-between; font-size: 0.8rem; }
    .xsc__ex { color: var(--color-text); min-width: 0; }
    .xsc__sets { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: flex-end; color: var(--color-text-soft); font-variant-numeric: tabular-nums; }
    .xsc__set { white-space: nowrap; }
    .xsc__rpe { color: var(--color-text-muted); }
    .xsc__notes { margin: 0.15rem 0 0; color: var(--color-text-muted); font-size: 0.75rem; font-style: italic; }
  `],
})
export class ExerciseSessionCard {
  readonly session = input.required<SessionDetailed>();

  protected readonly time = computed(() => londonTime(this.session().started_at));
  protected readonly groups = computed(() => groupSetsByExercise(this.session()));

  protected readonly meta = computed(() => {
    const st = sessionStats(this.session());
    const parts: string[] = [];
    if (st.sets) parts.push(`${st.sets} ${st.sets === 1 ? 'set' : 'sets'}`);
    if (st.volumeKg) parts.push(`${st.volumeKg} kg`);
    if (st.cardioMin) parts.push(`${st.cardioMin} min cardio`);
    return parts.join(' · ') || 'no entries';
  });

  protected cardioLabel(durationS: number | null, distanceKm: number | null, hr: number | null): string {
    const parts: string[] = [];
    if (durationS) parts.push(`${Math.round(durationS / 60)} min`);
    if (distanceKm) parts.push(`${distanceKm} km`);
    if (hr) parts.push(`${hr} bpm`);
    return parts.join(' · ') || '—';
  }
}
