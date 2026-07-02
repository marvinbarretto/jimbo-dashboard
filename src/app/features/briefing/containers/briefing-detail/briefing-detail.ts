import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import { loadOne } from '@shared/data-access/load-one';
import { BriefingsService } from '../../../briefings/data-access/briefings.service';
// Aliased: the component class shares its name with the BriefingRating *type*,
// which confuses the template type-checker's name resolution for (rate)'s $event.
import { BriefingRating as BriefingRatingControl } from '../../../briefings/components/briefing-rating/briefing-rating';
import type {
  BriefingAnalysis,
  BriefingRating as Rating,
} from '../../../briefings/data-access/briefing.types';

@Component({
  selector: 'app-briefing-detail',
  imports: [
    DatePipe, UiPageHeader, UiSection, UiMetaList, UiStack,
    UiLoadingState, UiEmptyState, UiProse, BriefingRatingControl,
  ],
  templateUrl: './briefing-detail.html',
  styles: [':host { display: block; max-width: 60rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BriefingDetail {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly briefings = inject(BriefingsService);

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  private readonly url = computed(() => {
    const id = this.id();
    return id ? `/api/briefing/${id}` : null;
  });

  private readonly state = loadOne<BriefingAnalysis>(this.http, this.url);

  // Local override so a rating set on this page reflects immediately without a
  // refetch — takes precedence over the cold-loaded record.
  private readonly override = signal<BriefingAnalysis | null>(null);

  protected readonly loading = computed(() => this.state().loading);
  protected readonly error = computed(() => this.state().error);
  protected readonly briefing = computed(() => this.override() ?? this.state().data);

  protected isSaving(id: number): boolean {
    return this.briefings.isSaving(id);
  }

  protected async onRate(b: BriefingAnalysis, ev: { rating: Rating; note: string | null }): Promise<void> {
    const updated = await this.briefings.rate(b.id, ev.rating, ev.note);
    if (updated) this.override.set(updated);
  }
}
