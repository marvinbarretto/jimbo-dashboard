import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
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
import { loadOne } from '@shared/data-access/load-one';

// Mirrors BriefingAnalysisSchema from jimbo-api/schemas/briefing.ts. Kept local
// (like mail-activity.service's EmailReport) — the dashboard has no generated
// client, so detail pages mirror the API contract they consume.
interface DayPlanEntry { time: string; suggestion: string; source: string; reasoning: string; }
interface EmailHighlight { source: string; headline: string; editorial: string; links: string[]; }
interface Surprise { fact: string; strategy: string; }
interface VaultTaskEntry { title: string; priority: number; actionability: string; note: string; }
interface BriefingAnalysis {
  id: number;
  session: string;
  model: string;
  generated_at: string;
  analysis: {
    day_plan: DayPlanEntry[];
    email_highlights: EmailHighlight[];
    surprise: Surprise | null;
    vault_tasks: VaultTaskEntry[];
  };
  user_rating: number | null;
  created_at: string;
}

@Component({
  selector: 'app-briefing-detail',
  imports: [DatePipe, UiPageHeader, UiSection, UiMetaList, UiStack, UiLoadingState, UiEmptyState],
  templateUrl: './briefing-detail.html',
  styles: [':host { display: block; max-width: 60rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BriefingDetail {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  private readonly url = computed(() => {
    const id = this.id();
    return id ? `/api/briefing/${id}` : null;
  });

  readonly state = loadOne<BriefingAnalysis>(this.http, this.url);
}
