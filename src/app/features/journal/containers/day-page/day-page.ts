import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
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

  protected readonly phoneSummary = computed(() => {
    const events = this.telemetryEvents();

    // Screen & usage — UsageCollector emits hourly screen_session events
    const screenSessions = events.filter(e => e.collector === 'usage' && e.type === 'screen_session');
    const screenOnMinutes = Math.round(screenSessions.reduce((s, e) => s + (e.value ?? 0), 0) / 60);
    const unlocks = screenSessions.reduce((s, e) => s + ((e.payload?.['unlock_count'] as number) ?? 0), 0);
    const firstUnlockAt = screenSessions
      .flatMap(e => { const t = e.payload?.['first_unlock_ts'] as string | undefined; return t ? [t] : []; })
      .sort()[0] ?? null;
    const appUsage = ((events.find(e => e.collector === 'usage' && e.type === 'app_usage_daily')
      ?.payload?.['top_apps']) as Array<{ label: string; foreground_seconds: number }> | undefined) ?? [];

    // Notifications — group by short package name and bucket by hour
    const posted = events.filter(e => e.collector === 'notifications' && e.type === 'notifications.posted');
    const notifsByHour = new Array<number>(24).fill(0);
    const appMap = new Map<string, number>();
    for (const e of posted) {
      notifsByHour[new Date(e.ts).getHours()]++;
      const name = shortPkg(e.payload?.['pkg'] as string ?? '');
      appMap.set(name, (appMap.get(name) ?? 0) + 1);
    }
    const notifsByApp = [...appMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    // Battery — min/max/end from battery_level events, charge session count from charge_state_changed
    const batteryEvents = events.filter(e => e.collector === 'device' && e.type === 'battery_level');
    const levels = batteryEvents.map(e => Math.round(e.value ?? 0)).filter(v => v > 0);
    const chargeSessions = events.filter(
      e => e.collector === 'device' && e.type === 'charge_state_changed' && e.payload?.['plugged_in'] === true
    ).length;

    // Network — count kind transitions (wifi↔cellular = leaving/arriving at a known location)
    const netEvents = events
      .filter(e => e.collector === 'device' && e.type === 'network_state')
      .sort((a, b) => a.ts.localeCompare(b.ts));
    const networkSwitches = netEvents.filter(
      (e, i) => i > 0 && e.payload?.['kind'] !== netEvents[i - 1]?.payload?.['kind']
    ).length;

    // Movement — enter transitions only, skip 'still' (it's the baseline, not an event worth counting)
    const movementRows: Array<[string, number]> = [];
    const movMap = new Map<string, number>();
    for (const e of events.filter(e => e.collector === 'activity')) {
      if ((e.payload?.['transition'] as string) === 'enter') {
        const t = e.payload?.['activity_type'] as string ?? 'unknown';
        if (t !== 'still') movMap.set(t, (movMap.get(t) ?? 0) + 1);
      }
    }
    movMap.forEach((v, k) => movementRows.push([k, v]));
    movementRows.sort((a, b) => b[1] - a[1]);

    // Media sessions
    const mediaSessions = events
      .filter(e => e.collector === 'media' && e.type === 'media.session_started')
      .map(e => ({
        app: shortPkg(e.payload?.['pkg'] as string ?? ''),
        title: e.payload?.['title'] as string | null ?? null,
        artist: e.payload?.['artist'] as string | null ?? null,
        ts: e.ts,
      }));

    return {
      screenOnMinutes, unlocks, firstUnlockAt, appUsage,
      notifCount: posted.length, notifsByHour, notifsByApp,
      batteryMin: levels.length ? Math.min(...levels) : null,
      batteryMax: levels.length ? Math.max(...levels) : null,
      batteryEnd: levels.length ? levels[levels.length - 1] : null,
      chargeSessions, networkSwitches,
      movementRows, mediaSessions,
      locationPoints: events.filter(e => e.collector === 'location').length,
    };
  });

  protected readonly phoneNotifsByHour = computed(() => this.phoneSummary().notifsByHour);

  protected readonly Math = Math;

  protected formatMinutes(m: number): string {
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  }

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

function shortPkg(pkg: string): string {
  return pkg.split('.').at(-1) ?? pkg;
}

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
