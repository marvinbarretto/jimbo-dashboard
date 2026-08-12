import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EmailDetailStore } from '../../../email-detail.store';

/** Body tab: the raw text as fetched from Gmail. */
@Component({
  selector: 'app-email-body-panel',
  template: `
    @if (store.email()?.body_text; as body) {
      <p class="body-text">{{ body }}</p>
    } @else {
      <p class="soft">No body text stored for this email.</p>
    }
  `,
  styleUrl: '../email-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailBodyPanel {
  protected readonly store = inject(EmailDetailStore);
}
