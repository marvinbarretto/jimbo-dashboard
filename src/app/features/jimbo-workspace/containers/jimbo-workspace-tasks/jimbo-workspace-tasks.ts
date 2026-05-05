import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ApiSection } from '../../shared/api-section/api-section';
import { JimboWorkspaceService } from '../../data-access/jimbo-workspace.service';

@Component({
  selector: 'app-jimbo-workspace-tasks',
  imports: [ApiSection, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dump">
      <app-api-section title="GET /api/google-tasks/lists?account=jimbo" [source]="lists">
        <ng-template let-data><pre class="dump__json">{{ data | json }}</pre></ng-template>
      </app-api-section>

      <app-api-section title="GET /api/google-tasks/tasks?account=jimbo&listId=@default" [source]="tasks">
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
export class JimboWorkspaceTasks {
  private readonly service = inject(JimboWorkspaceService);
  protected readonly lists = this.service.taskLists();
  protected readonly tasks = this.service.tasks();
}
