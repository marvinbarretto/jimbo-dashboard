import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { MailDatasetCard } from '../../components/mail-dataset-card/mail-dataset-card';
import type { EndpointConfig } from '../../../api-data/data-pages';

const MAIL_GMAIL_PROFILE_ENDPOINT: EndpointConfig = {
  title: 'Gmail profile',
  path: '/api/google-mail/profile',
  summary: 'Connected Gmail account metadata.',
};

const MAIL_REPORTS_ENDPOINT: EndpointConfig = {
  title: 'Pipeline rows',
  path: '/api/emails/reports',
  summary: 'Email triage pipeline rows, most recent first.',
  params: { limit: 50 },
};

const MAIL_GMAIL_ENDPOINT: EndpointConfig = {
  title: 'Recent Gmail',
  path: '/api/google-mail/messages',
  summary: 'Raw Gmail messages.',
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
  protected readonly profileEndpoint = MAIL_GMAIL_PROFILE_ENDPOINT;
  protected readonly reportsEndpoint = MAIL_REPORTS_ENDPOINT;
  protected readonly gmailEndpoint = MAIL_GMAIL_ENDPOINT;
}
