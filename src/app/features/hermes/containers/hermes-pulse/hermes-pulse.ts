import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map, startWith } from 'rxjs';
import { HermesService } from '../../data-access/hermes.service';
import { formatCountdown, relativeTime, stateBadgeTone } from '../../hermes.utils';

@Component({
  selector: 'app-hermes-pulse',
  templateUrl: './hermes-pulse.html',
  styleUrl: './hermes-pulse.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HermesPulse {
  private readonly hermes = inject(HermesService);

  private readonly tick = toSignal(
    interval(1000).pipe(startWith(0), map(() => new Date())),
    { initialValue: new Date() }
  );

  readonly runningJobs = this.hermes.runningJobs;
  readonly recentRuns = this.hermes.recentRuns;
  readonly nextJob = this.hermes.nextFiringJob;
  readonly failingJobs = computed(() => this.hermes.jobs().filter(j => j.last_status && j.last_status !== 'ok' && j.last_status !== 'success'));
  readonly isLoaded = computed(() => this.hermes.snapshot() !== null);
  readonly loadError = this.hermes.loadError;

  readonly stats = computed(() => [
    { label: 'total', value: this.hermes.total(), tone: '' },
    { label: 'active', value: this.hermes.activeCount(), tone: 'success' },
    { label: 'paused', value: this.hermes.pausedCount(), tone: 'warning' },
    { label: 'failing', value: this.hermes.failingCount(), tone: this.hermes.failingCount() > 0 ? 'danger' : '' },
  ]);

  readonly countdown = computed(() =>
    formatCountdown(this.nextJob()?.next_run_at ?? null, this.tick())
  );

  readonly syncAge = computed(() => relativeTime(this.hermes.lastSync()));

  readonly isRunning = computed(() => this.runningJobs().length > 0);

  protected readonly relativeTime = relativeTime;
  protected readonly stateBadgeTone = stateBadgeTone;
}
