import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { BriefingsService } from '../../../briefings/data-access/briefings.service';
import { BriefingRating } from '../../../briefings/components/briefing-rating/briefing-rating';
import type {
  BriefingAnalysis,
  BriefingRating as Rating,
} from '../../../briefings/data-access/briefing.types';
import { type DayKey, dateFromDayKey, shiftDay } from '../../utils/date-keys';

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

  protected readonly briefings = signal<BriefingAnalysis[]>([]);
  protected readonly loading = signal(false);

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

  constructor() {
    // Re-fetch whenever the day changes. Local-midnight boundaries so the
    // afternoon briefing buckets to this calendar day, not the next.
    effect(() => {
      const key = this.date();
      void this.loadFor(key);
    });
  }

  private async loadFor(key: DayKey): Promise<void> {
    this.loading.set(true);
    try {
      const since = dateFromDayKey(key).toISOString();
      const until = dateFromDayKey(shiftDay(key, 1)).toISOString();
      this.briefings.set(await this.service.fetchForDate(since, until));
    } catch {
      this.briefings.set([]);
    } finally {
      this.loading.set(false);
    }
  }

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
