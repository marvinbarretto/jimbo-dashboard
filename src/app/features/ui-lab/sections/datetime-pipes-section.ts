import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TableShell } from '@shared/components/table-shell/table-shell';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { DatetimePipe } from '@shared/pipes/datetime.pipe';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-datetime-pipes-section',
  imports: [TableShell, UiMetaList, UiSection, UiStack, DatetimePipe, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Date &amp; Time Pipes" [collapsible]="false">
      <app-ui-stack gap="md">
        <app-ui-meta-list>
          <dt>datetime</dt>
          <dd><code>value | datetime</code> — ISO string → "2 May 14:18:00". Includes year when outside current year. Returns "—" for null/empty.</dd>
          <dt>relativeTime</dt>
          <dd><code>value | relativeTime</code> — ISO string → "5m ago", "in 2h", "just now". Returns "never" for null/empty.</dd>
        </app-ui-meta-list>

        <app-table-shell>
          <table class="ui-lab__table ui-lab__table--pipes">
            <thead>
              <tr>
                <th>Raw ISO</th>
                <th>datetime</th>
                <th>relativeTime</th>
              </tr>
            </thead>
            <tbody>
              @for (sample of dateSamples; track sample.label) {
                <tr>
                  <td><code>{{ sample.iso }}</code></td>
                  <td>{{ sample.iso | datetime }}</td>
                  <td>{{ sample.iso | relativeTime }}</td>
                </tr>
              }
              <tr>
                <td><code>null</code></td>
                <td>{{ null | datetime }}</td>
                <td>{{ null | relativeTime }}</td>
              </tr>
            </tbody>
          </table>
        </app-table-shell>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class DatetimePipesSection {
  protected readonly dateSamples: readonly { label: string; iso: string }[] = [
    { label: 'recent',    iso: new Date(Date.now() - 3 * 60_000).toISOString() },
    { label: 'today',     iso: new Date(Date.now() - 2 * 3_600_000).toISOString() },
    { label: 'yesterday', iso: new Date(Date.now() - 26 * 3_600_000).toISOString() },
    { label: 'this year', iso: '2026-02-15T08:30:00.000Z' },
    { label: 'past year', iso: '2024-11-03T17:45:22.000Z' },
  ];
}
