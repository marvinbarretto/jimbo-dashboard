import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { loadOne } from '@shared/data-access/load-one';
import { BriefingReport } from '../../../briefings/components/briefing-report/briefing-report';
import { BriefingFeedbackService } from '../../../briefings/data-access/briefing-feedback.service';
import { CalendarBoard } from '../../components/calendar-board/calendar-board';
import { ActorActivity } from '../../components/actor-activity/actor-activity';
import type { BriefingAnalysis } from '../../../briefings/data-access/briefing.types';

// The overall rating widget is gone from this page on purpose: quality signal
// now comes from per-item hit/miss feedback inside the report, and any overall
// grade is derived from those.
@Component({
  selector: 'app-briefing-detail',
  imports: [
    DatePipe, TitleCasePipe, UiPage, UiPageHeader, UiStack,
    UiLoadingState, UiEmptyState, BriefingReport, CalendarBoard, ActorActivity,
  ],
  templateUrl: './briefing-detail.html',
  styleUrl: './briefing-detail.scss',
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

  // The logical day the briefing reviews: a morning briefing looks back at
  // yesterday, an afternoon one at today so far. Drives the actor-activity
  // swimlanes' fleet + code-session window.
  protected readonly reviewDay = computed(() => {
    const b = this.briefing();
    if (!b) return null;
    const d = new Date(b.generated_at);
    if (b.session === 'morning') d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  constructor() {
    effect(() => {
      const b = this.briefing();
      if (b) void this.feedback.load(b.id);
    });
  }
}
