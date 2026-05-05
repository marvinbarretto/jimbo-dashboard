import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ApiSection } from '../../shared/api-section/api-section';
import { JimboWorkspaceService } from '../../data-access/jimbo-workspace.service';

@Component({
  selector: 'app-jimbo-workspace-mail',
  imports: [ApiSection, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dump">
      <app-api-section title="GET /api/google-mail/profile?account=jimbo" [source]="profile">
        <ng-template let-data>
          <pre class="dump__json">{{ data | json }}</pre>
        </ng-template>
      </app-api-section>

      <app-api-section title="GET /api/google-mail/messages?account=jimbo&hours=720&limit=25" [source]="messages">
        <ng-template let-data>
          <pre class="dump__json">{{ data | json }}</pre>
        </ng-template>
      </app-api-section>
    </div>
  `,
  styles: [`
    .dump { display: flex; flex-direction: column; gap: 1.5rem; }
    .dump__json {
      padding: 0.75rem;
      background: var(--color-surface-soft, var(--color-surface));
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      font-size: 0.72rem;
      max-height: 60vh;
      overflow: auto;
      margin: 0;
    }
  `],
})
export class JimboWorkspaceMail {
  private readonly service = inject(JimboWorkspaceService);
  protected readonly profile = this.service.mailProfile();
  protected readonly messages = this.service.mailMessages(25);
}
