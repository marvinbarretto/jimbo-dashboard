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

// Mirrors ActivitySchema from jimbo-api/schemas/activity.ts.
interface Activity {
  id: string;
  timestamp: string;
  task_type: string;
  description: string;
  outcome: string | null;
  rationale: string | null;
  model_used: string | null;
  cost_id: string | null;
  satisfaction: number | null;
  notes: string | null;
}

@Component({
  selector: 'app-activity-detail',
  imports: [DatePipe, UiPageHeader, UiSection, UiMetaList, UiStack, UiLoadingState, UiEmptyState],
  templateUrl: './activity-detail.html',
  styles: [':host { display: block; max-width: 60rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityDetail {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  private readonly url = computed(() => {
    const id = this.id();
    return id ? `/api/activity/${id}` : null;
  });

  readonly state = loadOne<Activity>(this.http, this.url);
}
