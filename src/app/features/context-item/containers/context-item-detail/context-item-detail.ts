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
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import { loadOne } from '@shared/data-access/load-one';

// Mirrors the enriched ContextItemDetail from jimbo-api/routes/context.ts
// (ContextItemSchema + section/file breadcrumb fields).
interface ContextItemData {
  id: number;
  section_id: number;
  label: string | null;
  content: string;
  timeframe: string | null;
  status: string | null;
  category: string | null;
  expires_at: string | null;
  sort_order: number;
  updated_at: string;
  section_name: string;
  file_slug: string;
  file_name: string;
}

@Component({
  selector: 'app-context-item-detail',
  imports: [DatePipe, UiPageHeader, UiSection, UiMetaList, UiStack, UiLoadingState, UiEmptyState, UiProse],
  templateUrl: './context-item-detail.html',
  styles: [':host { display: block; max-width: 60rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextItemDetail {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
  private readonly url = computed(() => {
    const id = this.id();
    return id ? `/api/context/items/${id}` : null;
  });

  readonly state = loadOne<ContextItemData>(this.http, this.url);
}
