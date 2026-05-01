import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { MailDatasetCard } from '../../components/mail-dataset-card/mail-dataset-card';
import type { EndpointConfig } from '../../../api-data/data-pages';

const MAIL_STATS_ENDPOINT: EndpointConfig = {
  title: 'Email stats',
  path: '/api/emails/reports/stats',
  summary: 'Aggregate report counts and score distribution.',
};

const MAIL_GMAIL_PROFILE_ENDPOINT: EndpointConfig = {
  title: 'Gmail profile',
  path: '/api/google-mail/profile',
  summary: 'Connected Gmail account metadata.',
};

const MAIL_GEMS_ENDPOINT: EndpointConfig = {
  title: 'Today gems',
  path: '/api/emails/reports/gems/today',
  summary: 'High-value email surfaced today.',
};

const MAIL_UNDECIDED_ENDPOINT: EndpointConfig = {
  title: 'Undecided',
  path: '/api/emails/reports/undecided',
  summary: 'Reports still awaiting a score or operator decision.',
};

const MAIL_REPORTS_ENDPOINT: EndpointConfig = {
  title: 'Recent reports',
  path: '/api/emails/reports',
  summary: 'Latest processed email reports.',
  params: { limit: 50, sort: 'processed_at', order: 'desc' },
};

const MAIL_GMAIL_ENDPOINT: EndpointConfig = {
  title: 'Recent Gmail',
  path: '/api/google-mail/messages',
  summary: 'Raw Gmail messages before processing.',
  params: { hours: 24, limit: 30 },
};

@Component({
  selector: 'app-mail-next-page',
  imports: [MailDatasetCard, UiBackLink, UiPageHeader, UiSection, UiStack],
  templateUrl: './mail-next-page.html',
  styleUrl: './mail-next-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MailNextPage {
  protected readonly statsEndpoint = MAIL_STATS_ENDPOINT;
  protected readonly profileEndpoint = MAIL_GMAIL_PROFILE_ENDPOINT;
  protected readonly gemsEndpoint = MAIL_GEMS_ENDPOINT;
  protected readonly undecidedEndpoint = MAIL_UNDECIDED_ENDPOINT;
  protected readonly reportsEndpoint = MAIL_REPORTS_ENDPOINT;
  protected readonly gmailEndpoint = MAIL_GMAIL_ENDPOINT;
}
