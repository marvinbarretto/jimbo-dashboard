import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EndpointPanel } from '../../components/endpoint-panel/endpoint-panel';
import { TODAY_ENDPOINTS } from '../../data-pages';

@Component({
  selector: 'app-today-page',
  imports: [EndpointPanel],
  templateUrl: './today-page.html',
  styleUrl: './today-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodayPage {
  readonly endpoints = TODAY_ENDPOINTS;
}
