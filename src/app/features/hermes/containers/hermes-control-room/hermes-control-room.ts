import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { HermesService } from '../../data-access/hermes.service';
import type { HermesJob, HermesRun } from '../../hermes.types';
import { deliverLabel, formatBytes, formatDuration, relativeTime, stateBadgeTone } from '../../hermes.utils';

type ActionState = 'idle' | 'loading' | 'done' | 'error';

@Component({
  selector: 'app-hermes-control-room',
  imports: [FormsModule, UiSection],
  templateUrl: './hermes-control-room.html',
  styleUrl: './hermes-control-room.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HermesControlRoom {
  private readonly hermes = inject(HermesService);

  readonly selectedJob = signal<HermesJob | null>(null);

  readonly actionState = signal<ActionState>('idle');
  readonly actionError = signal<string | null>(null);

  readonly editingName = signal(false);
  readonly editingSchedule = signal(false);
  readonly editNameValue = signal('');
  readonly editScheduleValue = signal('');

  readonly runs = signal<HermesRun[]>([]);
  readonly runsTotal = signal(0);
  readonly runsLoading = signal(false);
  readonly expandedRunId = signal<string | null>(null);
  readonly expandedRunOutput = signal<string | null>(null);
  readonly expandedRunHasToolCalls = signal(false);
  readonly expandedRunLoading = signal(false);

  readonly promptOpen = signal(false);
  readonly runsOpen = signal(true);

  readonly sortedJobs = computed(() => {
    const order: Record<string, number> = { running: 0, scheduled: 1, paused: 2, completed: 3 };
    return [...this.hermes.jobs()].sort(
      (a, b) => (order[a.state] ?? 9) - (order[b.state] ?? 9)
    );
  });

  readonly isLoaded = computed(() => this.hermes.snapshot() !== null);
  readonly loadError = this.hermes.loadError;

  select(job: HermesJob): void {
    this.selectedJob.set(job);
    this.resetAction();
    this.editingName.set(false);
    this.editingSchedule.set(false);
    this.expandedRunId.set(null);
    this.expandedRunOutput.set(null);
    this.loadRuns(job.id);
  }

  loadRuns(jobId: string): void {
    this.runsLoading.set(true);
    this.hermes.getRuns(jobId).subscribe({
      next: (res) => {
        this.runs.set(res.runs);
        this.runsTotal.set(res.total);
        this.runsLoading.set(false);
      },
      error: () => this.runsLoading.set(false),
    });
  }

  toggleRun(runId: string): void {
    if (this.expandedRunId() === runId) {
      this.expandedRunId.set(null);
      this.expandedRunOutput.set(null);
      this.expandedRunHasToolCalls.set(false);
      return;
    }
    this.expandedRunId.set(runId);
    this.expandedRunOutput.set(null);
    this.expandedRunHasToolCalls.set(false);
    const job = this.selectedJob();
    if (!job) return;
    this.expandedRunLoading.set(true);
    this.hermes.getRunOutput(job.id, runId).subscribe({
      next: (out) => {
        this.expandedRunOutput.set(out.response);
        this.expandedRunHasToolCalls.set(out.has_tool_calls);
        this.expandedRunLoading.set(false);
      },
      error: () => {
        this.expandedRunOutput.set('Failed to load output.');
        this.expandedRunLoading.set(false);
      },
    });
  }

  runNow(): void {
    const job = this.selectedJob();
    if (!job) return;
    this.resetAction();
    this.actionState.set('loading');
    this.hermes.trigger(job.id).subscribe({
      next: () => this.actionState.set('done'),
      error: (err) => this.fail(err),
    });
  }

  pause(): void {
    const job = this.selectedJob();
    if (!job) return;
    this.resetAction();
    this.actionState.set('loading');
    this.hermes.pause(job.id).subscribe({
      next: () => this.actionState.set('done'),
      error: (err) => this.fail(err),
    });
  }

  resume(): void {
    const job = this.selectedJob();
    if (!job) return;
    this.resetAction();
    this.actionState.set('loading');
    this.hermes.resume(job.id).subscribe({
      next: () => this.actionState.set('done'),
      error: (err) => this.fail(err),
    });
  }

  remove(): void {
    const job = this.selectedJob();
    if (!job || !confirm(`Remove "${job.name}"? This cannot be undone.`)) return;
    this.resetAction();
    this.actionState.set('loading');
    this.hermes.remove(job.id).subscribe({
      next: () => {
        this.selectedJob.set(null);
        this.runs.set([]);
        this.runsTotal.set(0);
        this.actionState.set('idle');
      },
      error: (err) => this.fail(err),
    });
  }

  startEditName(): void {
    const job = this.selectedJob();
    if (!job) return;
    this.editNameValue.set(job.name);
    this.editingName.set(true);
    this.editingSchedule.set(false);
  }

  cancelEditName(): void {
    this.editingName.set(false);
  }

  saveName(): void {
    const job = this.selectedJob();
    const name = this.editNameValue().trim();
    if (!job || !name) return;
    this.resetAction();
    this.actionState.set('loading');
    this.hermes.update(job.id, { name }).subscribe({
      next: (updated) => {
        this.selectedJob.set(updated);
        this.editingName.set(false);
        this.actionState.set('done');
      },
      error: (err) => this.fail(err),
    });
  }

  startEditSchedule(): void {
    const job = this.selectedJob();
    if (!job) return;
    this.editScheduleValue.set(job.schedule_display ?? '');
    this.editingSchedule.set(true);
    this.editingName.set(false);
  }

  cancelEditSchedule(): void {
    this.editingSchedule.set(false);
  }

  saveSchedule(): void {
    const job = this.selectedJob();
    const schedule_display = this.editScheduleValue().trim();
    if (!job || !schedule_display) return;
    this.resetAction();
    this.actionState.set('loading');
    this.hermes.update(job.id, { schedule_display }).subscribe({
      next: (updated) => {
        this.selectedJob.set(updated);
        this.editingSchedule.set(false);
        this.actionState.set('done');
      },
      error: (err) => this.fail(err),
    });
  }

  private resetAction(): void {
    this.actionState.set('idle');
    this.actionError.set(null);
  }

  private fail(err: unknown): void {
    this.actionState.set('error');
    const msg = err instanceof Error ? err.message : 'Action failed';
    this.actionError.set(msg);
  }

  protected readonly relativeTime = relativeTime;
  protected readonly stateBadgeTone = stateBadgeTone;
  protected readonly deliverLabel = deliverLabel;
  protected readonly formatDuration = formatDuration;
  protected readonly formatBytes = formatBytes;
}
