import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModalShell } from '@shared/components/modal-shell/modal-shell';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { TriageTasksService, type InboxTask } from './triage-tasks.service';

interface TaskRow {
  readonly task: InboxTask;
  readonly isUrl: boolean;
}

type MobileTab = 'jimbo' | 'you';

@Component({
  selector: 'app-triage-tasks-page',
  imports: [
    RouterLink,
    ModalShell,
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

  protected readonly selectedTask = signal<InboxTask | null>(null);
  protected readonly mobileTab = signal<MobileTab>('jimbo');
  protected readonly userContext = signal('');

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

  protected looksLikeUrl(text: string): boolean {
    return looksLikeUrl(text);
  }

  protected openTask(task: InboxTask): void {
    this.selectedTask.set(task);
    this.mobileTab.set('jimbo');
    this.userContext.set('');
  }

  protected closeModal(): void {
    this.selectedTask.set(null);
  }

  protected onContextInput(value: string): void {
    this.userContext.set(value);
  }

  // No-op stubs — wire to real endpoints in the next iteration.
  protected discard(): void {
    console.log('[triage] discard', this.selectedTask()?.id, 'context:', this.userContext());
    this.closeModal();
  }
  protected skip(): void {
    console.log('[triage] skip', this.selectedTask()?.id);
    this.closeModal();
  }
  protected promote(): void {
    console.log('[triage] promote', this.selectedTask()?.id, 'context:', this.userContext());
    this.closeModal();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selectedTask()) this.closeModal();
  }
}

function looksLikeUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim());
}
