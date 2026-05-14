import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatetimePipe } from '@shared/pipes/datetime.pipe';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';

/**
 * Canonical timestamp display. Renders the relative form ("18m ago") as visible
 * text and the absolute form ("14 May 17:00:46") as the hover title, plus a
 * proper <time datetime="…"> wrapper for assistive tech and copy-paste.
 *
 * Use this anywhere a timestamp appears in the UI. Reach for the raw pipes only
 * when you have a domain-specific reason to show the absolute form (e.g. log
 * tables where times must align column-wise).
 */
@Component({
  selector: 'app-ui-timestamp',
  imports: [DatetimePipe, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <time
      class="ui-timestamp"
      [attr.datetime]="value()"
      [title]="value() | datetime"
    >{{ value() | relativeTime }}</time>
  `,
  styles: [`
    .ui-timestamp {
      font-variant-numeric: tabular-nums;
    }
  `],
})
export class UiTimestamp {
  readonly value = input.required<string | null | undefined>();
}
