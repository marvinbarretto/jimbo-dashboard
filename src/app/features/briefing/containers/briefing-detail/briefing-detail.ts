import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { loadOne } from '@shared/data-access/load-one';
import { BriefingReport } from '../../../briefings/components/briefing-report/briefing-report';
import { BriefingFeedbackService } from '../../../briefings/data-access/briefing-feedback.service';
import type { BriefingAnalysis } from '../../../briefings/data-access/briefing.types';

// The overall rating widget is gone from this page on purpose: quality signal
// now comes from per-item hit/miss feedback inside the report, and any overall
// grade is derived from those.
@Component({
  selector: 'app-briefing-detail',
  imports: [
    DatePipe, TitleCasePipe, UiPageHeader, UiStack,
    UiLoadingState, UiEmptyState, BriefingReport,
  ],
  templateUrl: './briefing-detail.html',
  styles: [':host { display: block; max-width: 60rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BriefingDetail {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly feedback = inject(BriefingFeedbackService);

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  private readonly url = computed(() => {
    const id = this.id();
    return id ? `/api/briefing/${id}` : null;
  });

  private readonly state = loadOne<BriefingAnalysis>(this.http, this.url);

  protected readonly loading = computed(() => this.state().loading);
  protected readonly error = computed(() => this.state().error);
  protected readonly briefing = computed(() => this.state().data);

  constructor() {
    effect(() => {
      const b = this.briefing();
      if (b) void this.feedback.load(b.id);
    });
  }
}
