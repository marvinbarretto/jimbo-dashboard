import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  type MonthKey,
  formatMonthLong,
  isMonthKey,
  shiftMonth,
  thisMonthKey,
} from '../../utils/date-keys';

@Component({
  selector: 'app-journal-month-page',
  imports: [
    RouterLink,
    UiStack,
    UiSection,
    UiStatCard,
    UiEmptyState,
    UiLoadingState,
    JournalBarChart,
    JournalDonutChart,
    JournalPager,
  ],
  templateUrl: './month-page.html',
  styleUrl: './month-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalMonthPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly journal = inject(JournalDataService);
  private readonly projects = inject(ProjectsService);

  protected readonly key = toSignal(
    this.route.paramMap.pipe(map(p => sanitiseKey(p.get('month')))),
    { initialValue: thisMonthKey() },
  );

  protected readonly bundle = this.journal.month;
  protected readonly loading = computed(() => this.journal.loading() === 'month' && !this.bundle());
  protected readonly title = computed(() => formatMonthLong(this.key()));
  protected readonly subtitle = computed(() => this.key());
  protected readonly isThisMonth = computed(() => this.key() === thisMonthKey());

  protected readonly dayLabels = computed(() => {
    const b = this.bundle();
    if (!b) return [];
    return b.days.map(d => d.split('-')[2] ?? d);
  });
  protected readonly minutesPerDay = computed(() => this.bundle()?.minutes_per_day ?? []);
  protected readonly pomosPerDay = computed(() => this.bundle()?.pomos_per_day ?? []);

  protected readonly projectLabels = computed(() =>
    (this.bundle()?.by_project ?? []).map(p => this.projectName(p.project_id)),
  );
  protected readonly projectValues = computed(() =>
    (this.bundle()?.by_project ?? []).map(p => p.minutes),
  );

  protected readonly projectRows = computed(() => {
    const b = this.bundle();
    if (!b) return [];
    return b.by_project.map(p => ({
      label: this.projectName(p.project_id),
      minutes: p.minutes,
      sessions: p.sessions,
    }));
  });

  protected readonly heatmapDays = computed(() => {
    const b = this.bundle();
    if (!b) return [];
    const max = Math.max(1, ...b.minutes_per_day);
    return b.days.map((day, i) => ({
      key: day,
      day: Number(day.split('-')[2]),
      minutes: b.minutes_per_day[i] ?? 0,
      pomos: b.pomos_per_day[i] ?? 0,
      intensity: Math.min(1, (b.minutes_per_day[i] ?? 0) / max),
    }));
  });

  constructor() {
    effect(() => {
      const k = this.key();
      this.journal.loadMonth(k);
    });
  }

  protected previous(): void {
    this.navigateTo(shiftMonth(this.key(), -1));
  }

  protected next(): void {
    this.navigateTo(shiftMonth(this.key(), 1));
  }

  protected today(): void {
    this.navigateTo(thisMonthKey());
  }

  protected onDateChange(value: string): void {
    if (isMonthKey(value)) this.navigateTo(value);
  }

  private navigateTo(key: MonthKey): void {
    this.router.navigate(['/journal/month', key]);
  }

  protected projectName(id: string | null): string {
    if (!id) return 'Unassigned';
    return this.projects.getById(id)?.display_name ?? id;
  }
}

function sanitiseKey(raw: string | null): MonthKey {
  return isMonthKey(raw) ? raw : thisMonthKey();
}
