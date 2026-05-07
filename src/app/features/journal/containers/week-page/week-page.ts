import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { map } from 'rxjs';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import { JournalDataService } from '../../data-access/journal-data.service';
import { JournalBarChart } from '../../components/bar-chart/bar-chart';
import { JournalDonutChart } from '../../components/donut-chart/donut-chart';
import { JournalPager } from '../../components/journal-pager/journal-pager';
import {
  type WeekKey,
  formatWeekRange,
  isWeekKey,
  shiftWeek,
  thisWeekKey,
  weekStartFromKey,
  weekKeyFromDate,
  dateFromDayKey,
  isDayKey,
} from '../../utils/date-keys';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

@Component({
  selector: 'app-journal-week-page',
  imports: [
    RouterLink,
    RouterLinkActive,
    UiStack,
    UiSection,
    UiStatCard,
    UiEmptyState,
    UiLoadingState,
    JournalBarChart,
    JournalDonutChart,
    JournalPager,
  ],
  templateUrl: './week-page.html',
  styleUrl: './week-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalWeekPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly journal = inject(JournalDataService);
  private readonly projects = inject(ProjectsService);

  protected readonly key = toSignal(
    this.route.paramMap.pipe(map(p => sanitiseKey(p.get('week')))),
    { initialValue: thisWeekKey() },
  );

  protected readonly bundle = this.journal.week;
  protected readonly loading = computed(() => this.journal.loading() === 'week' && !this.bundle());
  protected readonly title = computed(() => this.key());
  protected readonly subtitle = computed(() => formatWeekRange(this.key()));
  protected readonly isThisWeek = computed(() => this.key() === thisWeekKey());
  protected readonly mondayValue = computed(() => {
    const monday = weekStartFromKey(this.key());
    return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
  });

  protected readonly dayLabels = computed(() => DAY_LABELS);
  protected readonly minutesPerDay = computed(() => this.bundle()?.minutes_per_day ?? []);
  protected readonly pomosPerDay = computed(() => this.bundle()?.pomos_per_day ?? []);
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

  protected readonly dayLinks = computed(() => {
    const b = this.bundle();
    if (!b) return [];
    return b.days.map((day, i) => ({
      key: day,
      label: DAY_LABELS[i] ?? day,
      minutes: b.minutes_per_day[i] ?? 0,
      pomos: b.pomos_per_day[i] ?? 0,
      activities: b.activities_per_day[i] ?? 0,
    }));
  });

  constructor() {
    effect(() => {
      const k = this.key();
      this.journal.loadWeek(k);
    });
  }

  protected previous(): void {
    this.navigateTo(shiftWeek(this.key(), -1));
  }

  protected next(): void {
    this.navigateTo(shiftWeek(this.key(), 1));
  }

  protected today(): void {
    this.navigateTo(thisWeekKey());
  }

  protected onDateChange(value: string): void {
    if (isDayKey(value)) {
      this.navigateTo(weekKeyFromDate(dateFromDayKey(value)));
    }
  }

  private navigateTo(key: WeekKey): void {
    this.router.navigate(['/journal/week', key]);
  }

  protected projectName(id: string | null): string {
    if (!id) return 'Unassigned';
    return this.projects.getById(id)?.display_name ?? id;
  }
}

function sanitiseKey(raw: string | null): WeekKey {
  return isWeekKey(raw) ? raw : thisWeekKey();
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
