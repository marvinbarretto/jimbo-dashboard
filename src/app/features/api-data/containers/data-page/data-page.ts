import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EndpointPanel } from '../../components/endpoint-panel/endpoint-panel';
import { DATA_PAGE_BY_KEY, type DataPageConfig } from '../../data-pages';

@Component({
  selector: 'app-data-page',
  imports: [EndpointPanel],
  templateUrl: './data-page.html',
  styleUrl: './data-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataPage {
  private readonly route = inject(ActivatedRoute);

  readonly page: DataPageConfig | null = DATA_PAGE_BY_KEY.get(String(this.route.snapshot.data['domain'])) ?? null;
}
