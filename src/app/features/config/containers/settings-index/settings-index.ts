import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiButtonLink } from '@shared/components/ui-button-link/ui-button-link';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

// Each settings domain keeps its own page (different shapes — toggle grids vs
// scalar fields vs whatever comes next), so this stays a plain link-out index
// rather than a generic settings renderer. Fixes discoverability (calendar
// settings in particular lives outside /config entirely) without forcing
// every domain into one shared form.
interface SettingsEntry {
  readonly title: string;
  readonly description: string;
  readonly link: string;
}

const SETTINGS_ENTRIES: readonly SettingsEntry[] = [
  {
    title: 'Grooming',
    description: 'GitHub issue assessment routing — who runs it (executor) and with which skill.',
    link: '/grooming/settings',
  },
  {
    title: 'Execution',
    description: 'Execution board Done-lane auto-clear threshold.',
    link: '/execution/settings',
  },
  {
    title: 'Calendar',
    description: 'Which calendars Jimbo reads when fetching events.',
    link: '/calendar-settings',
  },
  {
    title: 'Tasks',
    description: 'Which Google Tasks lists feed into triage.',
    link: '/tasks/settings',
  },
  {
    title: 'Notifications',
    description: 'Check-in hours and assignment pings — when Jimbo is allowed to interrupt you.',
    link: '/notification-settings',
  },
];

@Component({
  selector: 'app-settings-index',
  imports: [UiButtonLink, UiPage, UiPageHeader, UiSection, UiStack],
  templateUrl: './settings-index.html',
  styleUrl: './settings-index.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsIndex {
  readonly entries = SETTINGS_ENTRIES;
}
