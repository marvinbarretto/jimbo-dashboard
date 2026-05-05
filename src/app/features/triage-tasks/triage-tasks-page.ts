import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ModalShell } from '@shared/components/modal-shell/modal-shell';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { TriageTasksService, type InboxTask, type TriageDebug, type TriageProposal } from './triage-tasks.service';

interface TaskRow {
  readonly task: InboxTask;
  readonly isUrl: boolean;
}

type MobileTab = 'jimbo' | 'you';

@Component({
  selector: 'app-triage-tasks-page',
  imports: [
    JsonPipe,
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

  // Jimbo's view state
  protected readonly proposal = signal<TriageProposal | null>(null);
  protected readonly proposalDebug = signal<TriageDebug | null>(null);
  protected readonly proposalLoading = signal(false);
  protected readonly proposalError = signal<string | null>(null);
  protected readonly debugOpen = signal(false);
  protected readonly detailsOpen = signal(false);

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
    console.log('[triage] openTask', task.id, task.title);
    this.selectedTask.set(task);
    this.mobileTab.set('jimbo');
    this.userContext.set('');
    this.resetProposalState();
  }

  protected closeModal(): void {
    console.log('[triage] closeModal');
    this.selectedTask.set(null);
    this.resetProposalState();
  }

  private resetProposalState(): void {
    this.proposal.set(null);
    this.proposalDebug.set(null);
    this.proposalError.set(null);
    this.proposalLoading.set(false);
    this.debugOpen.set(false);
  }

  protected askJimbo(): void {
    const task = this.selectedTask();
    if (!task) {
      console.warn('[triage] askJimbo with no selected task');
      return;
    }
    const ctx = this.userContext();
    console.log('[triage] askJimbo START', { taskId: task.id, listId: task.listId, ctxLen: ctx.length });
    this.proposalLoading.set(true);
    this.proposalError.set(null);
    this.proposal.set(null);
    this.proposalDebug.set(null);

    const t0 = performance.now();
    this.service.triageNow(task.listId, task.id, ctx).subscribe({
      next: result => {
        const elapsed = Math.round(performance.now() - t0);
        console.log(`[triage] askJimbo OK in ${elapsed}ms`);
        console.log('[triage] proposal:', result.proposal);
        console.log('[triage] debug:', result.debug);
        this.proposal.set(result.proposal);
        this.proposalDebug.set(result.debug);
        this.proposalLoading.set(false);
        if (!result.proposal) {
          this.proposalError.set('Model returned text we could not parse as JSON. See debug → raw_response.');
          this.debugOpen.set(true);
        }
      },
      error: err => {
        const elapsed = Math.round(performance.now() - t0);
        console.error(`[triage] askJimbo FAILED in ${elapsed}ms`, err);
        const msg = err?.error?.error?.message ?? err?.error?.message ?? err?.message ?? 'Request failed';
        this.proposalError.set(msg);
        this.proposalLoading.set(false);
      },
    });
  }

  protected toggleDebug(): void {
    this.debugOpen.update(v => !v);
  }
  protected toggleDetails(): void {
    this.detailsOpen.update(v => !v);
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
