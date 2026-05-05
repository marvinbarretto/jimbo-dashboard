import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { TriageTasksService, type GoogleTask } from './triage-tasks.service';

interface TaskRow {
  readonly task: GoogleTask;
  readonly isUrl: boolean;
}

@Component({
  selector: 'app-triage-tasks-page',
  imports: [
    UiBackLink,
    UiButton,
    UiEmptyState,
    UiLoadingState,
    UiPageHeader,
    UiStack,
    RelativeTimePipe,
  ],
  templateUrl: './triage-tasks-page.html',
  styleUrl: './triage-tasks-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TriageTasksPage {
  protected readonly service = inject(TriageTasksService);

  protected readonly rows = computed<TaskRow[] | undefined>(() => {
    const tasks = this.service.tasks();
    if (tasks === undefined) return undefined;
    return tasks.map(task => ({
      task,
      isUrl: looksLikeUrl(task.title),
    }));
  });

  constructor() {
    this.service.load();
  }

  protected refresh(): void {
    this.service.load();
  }
}

function looksLikeUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim());
}
