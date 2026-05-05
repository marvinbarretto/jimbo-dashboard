import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ApiSection } from '../../shared/api-section/api-section';
import { JimboWorkspaceService } from '../../data-access/jimbo-workspace.service';

@Component({
  selector: 'app-jimbo-workspace-calendar',
  imports: [ApiSection, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dump">
      <app-api-section title="GET /api/google-calendar/calendars?account=jimbo" [source]="calendars">
        <ng-template let-data><pre class="dump__json">{{ data | json }}</pre></ng-template>
      </app-api-section>

      <app-api-section title="GET /api/google-calendar/events?account=jimbo&days=14" [source]="events">
        <ng-template let-data><pre class="dump__json">{{ data | json }}</pre></ng-template>
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
export class JimboWorkspaceCalendar {
  private readonly service = inject(JimboWorkspaceService);
  protected readonly calendars = this.service.calendars();
  protected readonly events = this.service.events(14);
}
