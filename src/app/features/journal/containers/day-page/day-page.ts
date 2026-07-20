import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { formatPageTitle } from '@app/app-title-strategy';
import { map } from 'rxjs';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { absoluteTime, formatMinutes, pluralise } from '@shared/utils/datetime.utils';
import { dedupeWindowedSum } from '../../utils/windowed-telemetry';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import { JournalDataService } from '../../data-access/journal-data.service';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiDonutChart } from '@shared/components/ui-donut-chart/ui-donut-chart';
import { UiPeriodPager } from '@shared/components/ui-period-pager/ui-period-pager';
import { JournalDaySummary } from '../../components/journal-day-summary/journal-day-summary';
import { JournalAgentsSection } from '../../components/journal-agents-section/journal-agents-section';
import { JournalCodeSessionsSection } from '../../components/journal-code-sessions-section/journal-code-sessions-section';
import { JournalTimelineSection } from '../../components/journal-timeline-section/journal-timeline-section';
import { JournalMcpSection } from '../../components/journal-mcp-section/journal-mcp-section';
import { JournalBriefingsSection } from '../../components/journal-briefings-section/journal-briefings-section';
import { JournalConsumptionSection } from '../../components/journal-consumption-section/journal-consumption-section';
import { JournalSectionNav, type JournalNavSection } from '../../components/journal-section-nav/journal-section-nav';
import { NutritionDaySection } from '../../../nutrition/components/nutrition-day-section/nutrition-day-section';
import { ExerciseDaySection } from '../../../exercise/components/exercise-day-section/exercise-day-section';
import {
  type DayKey,
  formatDayLong,
  isDayKey,
  shiftDay,
  todayKey,
} from '@shared/utils/date-keys';

@Component({
  selector: 'app-journal-day-page',
  imports: [
    DecimalPipe,
    UiStack,
    UiSection,
    UiSubsection,
    UiSubhead,
    UiStatCard,
    UiEmptyState,
    UiLoadingState,
    UiBarChart,
    UiDonutChart,
    UiPeriodPager,
    JournalDaySummary,
    JournalAgentsSection,
    JournalCodeSessionsSection,
    JournalTimelineSection,
    JournalMcpSection,
    JournalBriefingsSection,
    JournalConsumptionSection,
    JournalSectionNav,
    NutritionDaySection,
    ExerciseDaySection,
  ],
  templateUrl: './day-page.html',
  styleUrl: './day-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalDayPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);
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

  protected readonly workMeta = computed(() => {
    const t = this.bundle()?.totals;
    if (!t) return '';
    const parts: string[] = [];
    if (t.pomos_completed) parts.push(pluralise(t.pomos_completed, 'pomo'));
    if (t.focus_minutes) parts.push(formatMinutes(t.focus_minutes) + ' focus');
    return parts.join(' · ') || 'Nothing logged yet';
  });

  protected readonly healthMeta = computed(() =>
    this.healthSummary() ? 'From Health Connect' : 'No data',
  );

  // ── Empty-collapse ──────────────────────────────────────────────────────
  // Each inline section reports whether it has anything worth showing; an
  // empty section collapses to its one-line header instead of a tall empty
  // state. These run inside the loaded-bundle block so there's no load flicker.
  protected readonly hasWork = computed(() => {
    const b = this.bundle();
    if (!b) return false;
    const t = b.totals;
    return Boolean(t.pomos_completed || t.focus_minutes || b.sessions.length || b.events.length);
  });
  protected readonly hasHealth = computed(() => this.healthSummary() != null);
  protected readonly hasCode = computed(() => this.commitsSummary() != null);
  protected readonly hasPhone = computed(() => this.telemetryEvents().length > 0);

  // linkedSignal so the user can still expand a collapsed section by hand;
  // it re-syncs to the data the moment a different day loads.
  protected readonly workOpen = linkedSignal(() => this.hasWork());
  protected readonly healthOpen = linkedSignal(() => this.hasHealth());
  protected readonly codeOpen = linkedSignal(() => this.hasCode());
  protected readonly phoneOpen = linkedSignal(() => this.hasPhone());

  // Chip scroll-spy targets. Ids match the anchor host elements in the
  // template. Order mirrors the on-page section order.
  protected readonly navSections: readonly JournalNavSection[] = [
    { id: 'jsec-briefings', label: 'Briefings' },
    { id: 'jsec-timeline', label: 'Timeline' },
    { id: 'jsec-work', label: 'Work' },
    { id: 'jsec-health', label: 'Health' },
    { id: 'jsec-code-sessions', label: 'Sessions' },
    { id: 'jsec-code', label: 'Code' },
    { id: 'jsec-agents', label: 'Agents' },
    { id: 'jsec-mcp', label: 'MCP' },
    { id: 'jsec-nutrition', label: 'Nutrition' },
    { id: 'jsec-exercise', label: 'Exercise' },
    { id: 'jsec-phone', label: 'Phone' },
    { id: 'jsec-consumption', label: 'Consumption' },
  ];

  protected readonly hourlyLabels = computed(() => HOUR_LABELS);
  protected readonly hourlyValues = computed(() => this.bundle()?.hourly_minutes ?? []);
  protected readonly projectLabels = computed(() =>
    (this.bundle()?.by_project ?? []).map(p => this.projectName(p.project_id)),
  );
  protected readonly projectValues = computed(() =>
    (this.bundle()?.by_project ?? []).map(p => p.minutes),
  );
  protected readonly telemetryEvents = computed(() => this.bundle()?.telemetry ?? []);

  protected readonly phoneSummary = computed(() => {
    const events = this.telemetryEvents();

    // Screen & usage — UsageCollector emits every ~30min, each event covering
    // a rolling 2-hour window. Raw sums over-count ~4×; dedupe to a
    // non-overlapping cover instead.
    const screenSessions = events.filter(e => e.collector === 'usage' && e.type === 'screen_session');
    const screenOnMinutes = Math.round(dedupeWindowedSum(screenSessions, e => e.value ?? 0) / 60);
    const unlocks = Math.round(
      dedupeWindowedSum(screenSessions, e => (e.payload?.['unlock_count'] as number) ?? 0),
    );
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

  protected readonly commitsSummary = computed(() => {
    type CommitRow = { sha: string; subject: string; author_name: string; author_date: string };
    type RepoBucket = { repo: string; pushes: number; commits: CommitRow[] };

    const events = this.telemetryEvents().filter(e => e.collector === 'github' && e.type === 'push');
    if (!events.length) return null;

    const byRepo = new Map<string, RepoBucket>();
    const commitsByHour = new Array<number>(24).fill(0);
    let totalCommits = 0;

    for (const e of events) {
      const repo = e.source ?? 'unknown';
      const commits = (e.payload?.['commits'] as CommitRow[] | undefined) ?? [];
      const bucket: RepoBucket = byRepo.get(repo) ?? { repo, pushes: 0, commits: [] };
      bucket.pushes += 1;
      bucket.commits.push(...commits);
      byRepo.set(repo, bucket);
      totalCommits += commits.length;
      // Author date over push ts — a single push can carry hours of work, and
      // the per-commit timestamp is closer to when the typing actually happened.
      for (const c of commits) commitsByHour[new Date(c.author_date).getHours()]++;
    }

    const repos = [...byRepo.values()].sort((a, b) => b.commits.length - a.commits.length);
    for (const r of repos) r.commits.sort((a, b) => a.author_date.localeCompare(b.author_date));

    return {
      totalPushes: events.length,
      totalCommits,
      repoCount: repos.length,
      commitsByHour,
      repos,
    };
  });

  protected readonly commitsByHour = computed(() => this.commitsSummary()?.commitsByHour ?? new Array<number>(24).fill(0));

  protected readonly codeMeta = computed(() => {
    const cs = this.commitsSummary();
    if (!cs) return '';
    const parts = [pluralise(cs.totalCommits, 'commit')];
    if (cs.repoCount > 1) parts.push(cs.repoCount + ' repos');
    return parts.join(' · ');
  });

  protected readonly healthSummary = computed(() => {
    const events = this.telemetryEvents().filter(e => e.collector === 'health_connect');
    if (!events.length) return null;

    // HC aggregates share the phone's rolling-2h-window emission pattern
    // (source: health_connect_aggregate) — same dedupe as screen_session,
    // or a 7k-step day reads as 26k.
    const sum = (type: string) =>
      dedupeWindowedSum(events.filter(e => e.type === type), e => e.value ?? 0);

    const steps = Math.round(sum('steps'));
    const distanceKm = sum('distance') / 1000;
    // Health Connect emits `calories_total` (total daily burn), not an
    // `calories_active` type — summing the latter always yielded 0.
    const energyKcal = Math.round(sum('calories_total'));
    const floors = Math.round(sum('floors'));

    // Exercise sessions — one event per session
    const exercises = events
      .filter(e => e.type === 'exercise_session')
      .map(e => ({
        type: e.payload?.['exercise_type'] as string ?? 'exercise',
        durationMin: Math.round(e.value ?? 0),
        ts: e.ts,
      }))
      .sort((a, b) => a.ts.localeCompare(b.ts));

    return { steps, distanceKm, energyKcal, floors, exercises };
  });

  protected readonly Math = Math;
  protected readonly formatMinutes = formatMinutes;

  constructor() {
    effect(() => this.titleService.setTitle(formatPageTitle(formatDayLong(this.key()))));
    effect(() => this.journal.loadDay(this.key()));
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

  protected repoShortName(full: string): string {
    return full.split('/').at(-1) ?? full;
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
