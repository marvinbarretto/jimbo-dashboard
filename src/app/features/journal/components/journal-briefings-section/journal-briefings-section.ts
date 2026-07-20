import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, from, of, startWith, switchMap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { BriefingsService } from '../../../briefings/data-access/briefings.service';
import { BriefingRating } from '../../../briefings/components/briefing-rating/briefing-rating';
import type {
  BriefingAnalysis,
  BriefingRating as Rating,
} from '../../../briefings/data-access/briefing.types';
import { type DayKey, dayWindowIso } from '@shared/utils/date-keys';

// The morning/afternoon briefings that belong to the journal day, with the same
// rating control as the archive. Self-contained (mirrors journal-agents-section):
// it fetches its own day-scoped list and persists ratings via BriefingsService.
@Component({
  selector: 'app-journal-briefings-section',
  imports: [RouterLink, UiSection, UiEmptyState, BriefingRating],
  templateUrl: './journal-briefings-section.html',
  styleUrl: './journal-briefings-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalBriefingsSection {
  private readonly service = inject(BriefingsService);

  readonly date = input.required<DayKey>();

  // switchMap so rapid day paging can't race: a slow earlier-day response is
  // unsubscribed rather than overwriting the current day (the old bare-async
  // effect was last-write-wins). Local-midnight boundaries so the afternoon
  // briefing buckets to this calendar day, not the next. startWith(null)
  // restores the loading state while a new day loads.
  private readonly fetched = toSignal(
    toObservable(this.date).pipe(
      switchMap(key => {
        const { since, until } = dayWindowIso(key);
        return from(this.service.fetchForDate(since, until)).pipe(
          catchError(() => of([] as BriefingAnalysis[])),
          startWith(null),
        );
      }),
    ),
    { initialValue: null },
  );

  protected readonly loading = computed(() => this.fetched() === null);

  // linkedSignal so onRate can patch a row in place; re-syncs on each fetch.
  protected readonly briefings = linkedSignal<BriefingAnalysis[]>(() => this.fetched() ?? []);

  // Order morning → afternoon for the day view (API returns newest-first).
  protected readonly ordered = computed(() =>
    [...this.briefings()].sort((a, b) => a.generated_at.localeCompare(b.generated_at)),
  );

  // Collapse to the header once we know there's nothing; stay open while loading
  // so a briefing-bearing day never flickers shut. Matches the sibling sections
  // and keeps the section-nav chip's target element in the DOM on empty days.
  protected readonly open = linkedSignal(() => this.loading() || this.ordered().length > 0);

  protected readonly sectionMeta = computed(() => {
    const n = this.ordered().length;
    return n ? `${n} briefing${n === 1 ? '' : 's'}` : 'none yet';
  });

  protected sessionLabel(session: string): string {
    if (session === 'morning') return 'Morning';
    if (session === 'afternoon') return 'Afternoon';
    return session;
  }

  protected isSaving(id: number): boolean {
    return this.service.isSaving(id);
  }

  protected async onRate(b: BriefingAnalysis, ev: { rating: Rating; note: string | null }): Promise<void> {
    const updated = await this.service.rate(b.id, ev.rating, ev.note);
    if (updated) {
      this.briefings.update(list => list.map(x => (x.id === updated.id ? updated : x)));
    }
  }
}
