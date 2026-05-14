import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TableShell } from '@shared/components/table-shell/table-shell';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiTimestamp } from '@shared/components/ui-timestamp/ui-timestamp';
import { DatetimePipe } from '@shared/pipes/datetime.pipe';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-datetime-pipes-section',
  imports: [TableShell, UiMetaList, UiSection, UiStack, UiTimestamp, DatetimePipe, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Date &amp; Time" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          <strong>Default to <code>app-ui-timestamp</code></strong> anywhere a timestamp appears
          in the UI. It renders the relative form ("18m ago") as visible text and the absolute
          form ("14 May 17:00:46") as the hover title — plus a proper <code>&lt;time&gt;</code>
          element for assistive tech. The raw pipes are still available for the cases where
          you need only one of the two forms (e.g. log tables where times must align).
        </p>

        <div>
          <p class="ui-lab__subhead">app-ui-timestamp · canonical</p>
          <app-table-shell>
            <table class="ui-lab__table ui-lab__table--pipes">
              <thead>
                <tr>
                  <th>Raw ISO</th>
                  <th>Rendered (hover for absolute)</th>
                </tr>
              </thead>
              <tbody>
                @for (sample of dateSamples; track sample.label) {
                  <tr>
                    <td><code>{{ sample.iso }}</code></td>
                    <td><app-ui-timestamp [value]="sample.iso" /></td>
                  </tr>
                }
              </tbody>
            </table>
          </app-table-shell>
        </div>

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
