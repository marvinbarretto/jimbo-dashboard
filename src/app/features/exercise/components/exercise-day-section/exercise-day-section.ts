import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { catchError, of, switchMap, timer } from 'rxjs';
import type { SessionDetailed } from '../../data-access/exercise.service';
import { EXERCISE_READ } from '../../data-access/exercise.read';
import { ExerciseSessionCard } from '../exercise-session-card/exercise-session-card';
import { sessionStats } from '../../utils/exercise-format';

@Component({
  selector: 'app-exercise-day-section',
  imports: [UiSection, UiStack, UiStatCard, UiSubhead, UiEmptyState, UiLoadingState, ExerciseSessionCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exercise-day-section.html',
  styleUrl: './exercise-day-section.scss',
})
export class ExerciseDaySection {
  private readonly service = inject(EXERCISE_READ);

  // London calendar day (YYYY-MM-DD). Gym sessions are bucketed by London day
  // server-side; the journal day key is treated the same way here.
  readonly date = input.required<string>();

  private readonly result = toSignal(
    timer(0, 60_000).pipe(
      switchMap(() =>
        this.service.listDetailed({ date: this.date(), limit: 50 }).pipe(
          catchError(() => of({ items: [] as SessionDetailed[] })),
        ),
      ),
    ),
    { initialValue: null },
  );

  readonly loading = computed(() => this.result() === null);
  readonly sessions = computed<SessionDetailed[]>(() => this.result()?.items ?? []);

  // Collapse once we know nothing was logged; stay open while loading.
  readonly open = linkedSignal(() => this.loading() || this.sessions().length > 0);

  readonly totals = computed(() =>
    this.sessions().reduce(
      (acc, s) => {
        const st = sessionStats(s);
        return {
          sets: acc.sets + st.sets,
          volumeKg: acc.volumeKg + st.volumeKg,
          cardioMin: acc.cardioMin + st.cardioMin,
          cardioKm: Math.round((acc.cardioKm + st.cardioKm) * 100) / 100,
        };
      },
      { sets: 0, volumeKg: 0, cardioMin: 0, cardioKm: 0 },
    ),
  );

  readonly sectionMeta = computed(() => {
    const n = this.sessions().length;
    if (n === 0) return 'no sessions';
    const t = this.totals();
    return `${n} ${n === 1 ? 'session' : 'sessions'} · ${t.volumeKg} kg`;
  });
}
