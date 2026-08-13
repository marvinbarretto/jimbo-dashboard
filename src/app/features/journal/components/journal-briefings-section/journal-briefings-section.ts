import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { BriefingsService } from '../../../briefings/data-access/briefings.service';
import { BriefingRating } from '../../../briefings/components/briefing-rating/briefing-rating';
import { buildDayShape } from '../../../briefings/utils/day-shape';
import type {
  BriefingAnalysis,
  BriefingRating as Rating,
} from '../../../briefings/data-access/briefing.types';

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

  // Exact [since, until) ISO instants — the owning page supplies local
  // period boundaries (day, week or month). Optional (not required) so the
  // resource's request fn can run before inputs bind and return undefined.
  readonly since = input<string>();
  readonly until = input<string>();

  // httpResource keyed on the window inputs: refetches (and aborts in-flight)
  // when the period changes, so rapid paging can't land a stale period.
  private readonly briefingsRes = httpResource<BriefingAnalysis[]>(() => {
    const since = this.since();
    const until = this.until();
    if (!since || !until) return undefined;
    return `${environment.dashboardApiUrl}/api/briefing/history?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}&limit=10`;
  });

  protected readonly loading = computed(() =>
    this.briefingsRes.isLoading() && !this.briefingsRes.hasValue());

  // linkedSignal so onRate can patch a row in place; re-syncs on each fetch.
  protected readonly briefings = linkedSignal<BriefingAnalysis[]>(() =>
    this.briefingsRes.hasValue() ? (this.briefingsRes.value() ?? []) : []);

  /**
   * Order morning → afternoon for the day view (API returns newest-first), and
   * normalise each briefing's plan.
   *
   * The plan is derived once here rather than per binding: this used to read
   * `analysis.day_plan` straight from the template and rendered an empty plan
   * on every briefing, because nothing has written that field since v2 — the
   * plan has lived in `priorities` and `suggested_blocks` for months.
   */
  protected readonly ordered = computed(() =>
    [...this.briefings()]
      .sort((a, b) => a.generated_at.localeCompare(b.generated_at))
      .map((b) => ({ ...b, shape: buildDayShape(b.analysis) })),
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
