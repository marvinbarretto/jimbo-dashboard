import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map, startWith } from 'rxjs';
import { HermesService } from '../../data-access/hermes.service';
import type { HermesJob } from '../../hermes.types';
import { dayPercent, formatTime, relativeTime, stateBadgeTone, todayFireTimes } from '../../hermes.utils';

interface JobTimeline {
  job: HermesJob;
  fireTimes: Date[];
  hasActivityToday: boolean;
}

interface UpcomingFire {
  job: HermesJob;
  time: Date;
}

@Component({
  selector: 'app-hermes-timeline',
  templateUrl: './hermes-timeline.html',
  styleUrl: './hermes-timeline.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HermesTimeline {
  private readonly hermes = inject(HermesService);

  readonly minuteTick = toSignal(
    interval(60_000).pipe(startWith(0), map(() => new Date())),
    { initialValue: new Date() }
  );

  readonly isLoaded = computed(() => this.hermes.snapshot() !== null);
  readonly loadError = this.hermes.loadError;

  readonly nowPercent = computed(() => dayPercent(this.minuteTick()));
  readonly nowLabel = computed(() => formatTime(this.minuteTick()));

  readonly todayLabel = computed(() => {
    const d = this.minuteTick();
    return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  });

  readonly hourMarkers = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
  readonly hourPercents = this.hourMarkers.map(h => ({ label: h === 24 ? '' : `${h}:00`, percent: (h / 24) * 100 }));

  readonly jobTimelines = computed((): JobTimeline[] =>
    this.hermes.jobs().map(job => {
      const fireTimes = todayFireTimes(job);
      return { job, fireTimes, hasActivityToday: fireTimes.length > 0 };
    })
  );

  readonly activeTimelines = computed(() => this.jobTimelines().filter(t => t.hasActivityToday));
  readonly offScheduleJobs = computed(() => this.jobTimelines().filter(t => !t.hasActivityToday));

  readonly upcomingToday = computed((): UpcomingFire[] => {
    const now = this.minuteTick();
    const fires: UpcomingFire[] = [];
    for (const { job, fireTimes } of this.jobTimelines()) {
      for (const time of fireTimes) {
        if (time > now) fires.push({ job, time });
      }
    }
    return fires.sort((a, b) => a.time.getTime() - b.time.getTime()).slice(0, 10);
  });

  protected readonly dayPercent = dayPercent;
  protected readonly formatTime = formatTime;
  protected readonly relativeTime = relativeTime;
  protected readonly stateBadgeTone = stateBadgeTone;
}
