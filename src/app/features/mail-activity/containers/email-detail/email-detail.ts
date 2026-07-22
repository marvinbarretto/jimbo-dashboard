import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { loadOne } from '@shared/data-access/load-one';
import type { EmailReport } from '../../mail-activity.service';

@Component({
  selector: 'app-email-detail',
  imports: [DatePipe, UiPage, UiPageHeader, UiSection, UiMetaList, UiStack, UiLoadingState, UiEmptyState],
  templateUrl: './email-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailDetail {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  // Email is addressed by gmail_id across the mail feature (and the API:
  // GET /api/emails/reports/{gmail_id}), so the route param is the gmail_id.
  private readonly gmailId = toSignal(this.route.paramMap.pipe(map(p => p.get('gmailId'))));
  private readonly url = computed(() => {
    const id = this.gmailId();
    return id ? `/api/emails/reports/${id}` : null;
  });

  readonly state = loadOne<EmailReport>(this.http, this.url);
}
