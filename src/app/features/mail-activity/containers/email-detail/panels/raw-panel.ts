import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { EmailDetailStore } from '../../../email-detail.store';

/** Raw tab: the analysis payload exactly as stored — the page's escape hatch,
 *  so nothing rendered above is ever the only version of the truth. */
@Component({
  selector: 'app-email-raw-panel',
  imports: [JsonPipe],
  template: `
    @if (store.email()?.analysis; as raw) {
      <pre class="raw-json">{{ raw | json }}</pre>
    } @else {
      <p class="soft">No analysis payload stored on this row.</p>
    }
  `,
  styleUrl: '../email-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailRawPanel {
  protected readonly store = inject(EmailDetailStore);
}
