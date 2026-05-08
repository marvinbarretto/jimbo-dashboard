import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { absoluteTime } from '@shared/utils/datetime.utils';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import { JournalDataService } from '../../data-access/journal-data.service';
import { JournalBarChart } from '../../components/bar-chart/bar-chart';
import { JournalDonutChart } from '../../components/donut-chart/donut-chart';
import { JournalPager } from '../../components/journal-pager/journal-pager';
import {
  type DayKey,
  formatDayLong,
  isDayKey,
  shiftDay,
  todayKey,
} from '../../utils/date-keys';

@Component({
  selector: 'app-journal-day-page',
  imports: [
    DecimalPipe,
    KeyValuePipe,
    UiStack,
    UiSection,
    UiStatCard,
    UiEmptyState,
    UiLoadingState,
    JournalBarChart,
    JournalDonutChart,
    JournalPager,
  ],
  templateUrl: './day-page.html',
  styleUrl: './day-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalDayPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly journal = inject(JournalDataService);
  private readonly projects = inject(ProjectsService);

  protected readonly key = toSignal(
    this.route.paramMap.pipe(map(p => sanitiseKey(p.get('date')))),
    { initialValue: todayKey() },
  );

  protected readonly bundle = this.journal.day;
  protected readonly loading = computed(() => this.journal.loading() === 'day' && !this.bundle());
  protected readonly title = computed(() => formatDayLong(this.key()));
  protected readonly subtitle = computed(() => relativeDayLabel(this.key()));
  protected readonly isToday = computed(() => this.key() === todayKey());

  protected readonly hourlyLabels = computed(() => HOUR_LABELS);
  protected readonly hourlyValues = computed(() => this.bundle()?.hourly_minutes ?? []);
  protected readonly projectLabels = computed(() =>
    (this.bundle()?.by_project ?? []).map(p => this.projectName(p.project_id)),
  );
  protected readonly projectValues = computed(() =>
    (this.bundle()?.by_project ?? []).map(p => p.minutes),
  );
  protected readonly taskTypeRows = computed(() => {
    const map = this.bundle()?.by_task_type;
    if (!map) return [];
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  });

  protected readonly telemetryEvents = computed(() => this.bundle()?.telemetry ?? []);

  protected readonly telemetrySummary = computed(() => {
    const events = this.telemetryEvents();
    const notifCount = events.filter(e => e.collector === 'notifications').length;
    const activityEvents = events.filter(e => e.collector === 'activity');
    const mediaStarts = events.filter(e => e.collector === 'media' && e.type === 'media.session_started').length;
    const locationPoints = events.filter(e => e.collector === 'location').length;
    const byActivityType = new Map<string, number>();
    for (const e of activityEvents) {
      const activity = (e.payload?.['activity_type'] as string | undefined) ?? 'unknown';
      const transition = (e.payload?.['transition'] as string | undefined) ?? '';
      if (transition === 'enter') {
        byActivityType.set(activity, (byActivityType.get(activity) ?? 0) + 1);
      }
    }
    return { notifCount, mediaStarts, locationPoints, byActivityType };
  });

  constructor() {
    effect(() => {
      const k = this.key();
      this.journal.loadDay(k);
    });
  }

  protected previous(): void {
    this.navigateTo(shiftDay(this.key(), -1));
  }

  protected next(): void {
    this.navigateTo(shiftDay(this.key(), 1));
  }

  protected today(): void {
    this.navigateTo(todayKey());
  }

  protected onDateChange(value: string): void {
    if (isDayKey(value)) this.navigateTo(value);
  }

  private navigateTo(key: DayKey): void {
    this.router.navigate(['/journal/day', key]);
  }

  protected formatTime(iso: string): string {
    return absoluteTime(iso);
  }

  protected projectName(id: string | null): string {
    if (!id) return 'Unassigned';
    return this.projects.getById(id)?.display_name ?? id;
  }
}

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => `${h.toString().padStart(2, '0')}:00`);

function sanitiseKey(raw: string | null): DayKey {
  return isDayKey(raw) ? raw : todayKey();
}

// Friendly subtitle: "Today", "Yesterday", "3 days ago", "in 2 days".
function relativeDayLabel(key: DayKey): string {
  const today = todayKey();
  if (key === today) return 'Today';
  const [y1, m1, d1] = key.split('-').map(Number);
  const [y2, m2, d2] = today.split('-').map(Number);
  const target = new Date(y1, m1 - 1, d1).getTime();
  const now = new Date(y2, m2 - 1, d2).getTime();
  const diff = Math.round((target - now) / 86_400_000);
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `in ${diff} days`;
}
