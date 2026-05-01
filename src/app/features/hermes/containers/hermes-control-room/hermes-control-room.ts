import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { HermesService } from '../../data-access/hermes.service';
import type { HermesJob, HermesRun } from '../../hermes.types';
import { deliverLabel, formatBytes, formatDuration, relativeTime, stateBadgeTone } from '../../hermes.utils';

type ActionState = 'idle' | 'loading' | 'done' | 'error';

interface RunDetail {
  output: string | null;
  loading: boolean;
  hasToolCalls: boolean;
  toolCalls: string[];
}

@Component({
  selector: 'app-hermes-control-room',
  imports: [FormsModule, UiBadge, UiSection],
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

  // Multi-expand: set of open run IDs + per-run detail map
  readonly expandedRunIds = signal<ReadonlySet<string>>(new Set());
  readonly runDetails = signal<ReadonlyMap<string, RunDetail>>(new Map());

  readonly anyExpanded = computed(() => this.expandedRunIds().size > 0);
  readonly allExpanded = computed(() =>
    this.runs().length > 0 && this.runs().every(r => this.expandedRunIds().has(r.runId))
  );

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
    this.expandedRunIds.set(new Set());
    this.runDetails.set(new Map());
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
    const ids = new Set(this.expandedRunIds());
    if (ids.has(runId)) {
      ids.delete(runId);
      this.expandedRunIds.set(ids);
      return;
    }
    ids.add(runId);
    this.expandedRunIds.set(ids);
    this.loadRunDetail(runId);
  }

  expandAll(): void {
    const ids = new Set(this.runs().map(r => r.runId));
    this.expandedRunIds.set(ids);
    for (const run of this.runs()) {
      this.loadRunDetail(run.runId);
    }
  }

  collapseAll(): void {
    this.expandedRunIds.set(new Set());
  }

  private loadRunDetail(runId: string): void {
    const job = this.selectedJob();
    if (!job) return;
    // Skip if already loaded or currently loading
    if (this.runDetails().has(runId)) return;

    const map = new Map(this.runDetails());
    map.set(runId, { output: null, loading: true, hasToolCalls: false, toolCalls: [] });
    this.runDetails.set(map);

    this.hermes.getRunOutput(job.id, runId).subscribe({
      next: (out) => {
        const m = new Map(this.runDetails());
        m.set(runId, { output: out.response, loading: false, hasToolCalls: out.has_tool_calls, toolCalls: out.tool_calls });
        this.runDetails.set(m);
      },
      error: () => {
        const m = new Map(this.runDetails());
        m.set(runId, { output: 'Failed to load output.', loading: false, hasToolCalls: false, toolCalls: [] });
        this.runDetails.set(m);
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
