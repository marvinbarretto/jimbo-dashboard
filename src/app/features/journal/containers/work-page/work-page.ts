import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { formatPageTitle } from '@app/app-title-strategy';
import { map } from 'rxjs';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiDonutChart } from '@shared/components/ui-donut-chart/ui-donut-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import { absoluteTime, formatMinutes, pluralise } from '@shared/utils/datetime.utils';
import {
  type DayKey,
  dateFromDayKey,
  daysInMonth,
  daysInWeek,
  dayKeyOf,
  formatDayShort,
  isDayKey,
  isMonthKey,
  isWeekKey,
  shiftDay,
  todayKey,
} from '@shared/utils/date-keys';
import { RouterLink } from '@angular/router';
import { JournalCodeSessionsSection } from '../../components/journal-code-sessions-section/journal-code-sessions-section';
import { JournalPeriodHeader } from '../../components/journal-period-header/journal-period-header';
import {
  JournalDataService,
  type FocusSessionLite,
  type TelemetryEventLite,
} from '../../data-access/journal-data.service';
import type { CodeSession, CodeSessionHeartbeat } from '../../data-access/code-sessions.service';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import { heartbeatBursts } from '../../utils/retro-timeline';
import type { JournalGranularity } from '../../utils/period-links';
import { currentKeyFor } from '../../utils/period-links';
import { pollWhileVisible } from '../../utils/live-poll';
import {
  codeEvidenceSpans,
  dailyUnionMinutes,
  focusSpans,
  hourlyUnionMinutes,
  projectUnionMinutes,
  unionMinutes,
  type SpanMs,
} from '../../utils/work-measure';

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => `${h.toString().padStart(2, '0')}:00`);

const UNASSIGNED_COLOR = '#6b7280';

interface CommitRow {
  sha: string;
  subject: string;
  author_date: string;
}

interface RepoBucket {
  repo: string;
  pushes: number;
  commits: CommitRow[];
}

/**
 * The Work domain: desk time, pomodoros, project attribution and commits,
 * measured from ALL evidence (focus sessions + interactive code sessions).
 * Day granularity reads the shared day bundle; week/month read the work
 * bundle (focus + code + heartbeats + github pushes for the window).
 */
@Component({
  selector: 'app-journal-work-page',
  imports: [
    DecimalPipe,
    RouterLink,
    UiBarChart,
    UiDonutChart,
    UiEmptyState,
    UiLoadingState,
    UiPage,
    UiSection,
    UiStack,
    UiStatCard,
    UiSubhead,
    UiSubsection,
    JournalCodeSessionsSection,
    JournalPeriodHeader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './work-page.html',
  styleUrl: '../../journal-sections.scss',
})
export class JournalWorkPage {
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);
  private readonly journal = inject(JournalDataService);
  private readonly projects = inject(ProjectsService);

  protected readonly granularity = toSignal(
    this.route.data.pipe(map(d => (d['granularity'] ?? 'day') as JournalGranularity)),
    { initialValue: 'day' as JournalGranularity },
  );

  protected readonly key = toSignal(
    this.route.paramMap.pipe(map(p =>
      p.get('date') ?? p.get('week') ?? p.get('month') ?? '',
    )),
    { initialValue: '' },
  );

  private readonly safeKey = computed(() => {
    const g = this.granularity();
    const k = this.key();
    const ok = g === 'day' ? isDayKey(k) : g === 'week' ? isWeekKey(k) : isMonthKey(k);
    return ok ? k : currentKeyFor(g);
  });

  protected readonly isDay = computed(() => this.granularity() === 'day');

  // ── Data loads ────────────────────────────────────────────────────────────
  constructor() {
    effect(() => this.titleService.setTitle(formatPageTitle(`Work — ${this.safeKey()}`)));
    effect(() => {
      const g = this.granularity();
      const k = this.safeKey();
      if (g === 'day') void this.journal.loadDay(k);
      else void this.journal.loadWork(g, k);
    });

    // Keep a live period fresh; past periods load once (the service skips
    // cached immutable windows).
    pollWhileVisible(() => {
      const g = this.granularity();
      const k = this.safeKey();
      if (g === 'day') {
        if (k === todayKey()) void this.journal.loadDay(k);
      } else {
        void this.journal.loadWork(g, k);
      }
    });
  }

  protected readonly bundle = this.journal.day;
  protected readonly workBundle = this.journal.work;

  protected readonly loading = computed(() => {
    if (this.isDay()) {
      return this.journal.loading() === 'day' && this.bundle()?.date !== this.safeKey();
    }
    const wb = this.workBundle();
    return this.journal.loading() === 'work' &&
      !(wb && wb.granularity === this.granularity() && wb.key === this.safeKey());
  });

  // ── Shared evidence (granularity-independent accessors) ─────────────────
  private readonly focusSessions = computed<readonly FocusSessionLite[]>(() =>
    this.isDay() ? (this.bundle()?.sessions ?? []) : (this.workBundle()?.sessions ?? []));

  protected readonly codeSessions = computed<readonly CodeSession[]>(() =>
    this.isDay() ? (this.bundle()?.code_sessions ?? []) : (this.workBundle()?.code_sessions ?? []));

  private readonly heartbeats = computed<readonly CodeSessionHeartbeat[]>(() =>
    this.isDay() ? (this.bundle()?.heartbeats ?? []) : (this.workBundle()?.heartbeats ?? []));

  private readonly githubEvents = computed<readonly TelemetryEventLite[]>(() => {
    const source = this.isDay() ? (this.bundle()?.telemetry ?? []) : (this.workBundle()?.github_pushes ?? []);
    return source.filter(e => e.collector === 'github' && e.type === 'push');
  });

  // Marvin's interactive sessions only — executor time (boris/kipper) is the
  // fleet's, not the desk's.
  private readonly ownCodeSessions = computed(() => this.codeSessions().filter(s => !s.actor));
  private readonly bursts = computed(() => heartbeatBursts(this.heartbeats()));

  // Evidence-based desk spans: every Work visual derives from this one union
  // so the numbers agree.
  private readonly deskSpans = computed<SpanMs[]>(() => [
    ...focusSpans(this.focusSessions()),
    ...codeEvidenceSpans(this.ownCodeSessions(), this.bursts()),
  ]);

  protected readonly deskMinutes = computed(() => unionMinutes(this.deskSpans()));

  protected readonly pomosCompleted = computed(() =>
    this.focusSessions().filter(s => s.status === 'completed').length);
  protected readonly pomosAbandoned = computed(() =>
    this.focusSessions().filter(s => s.status === 'abandoned').length);

  protected readonly projectWork = computed(() => projectUnionMinutes(
    this.focusSessions(),
    this.ownCodeSessions(),
    this.bursts(),
  ));
  protected readonly projectLabels = computed(() => this.projectWork().map(p => this.projectName(p.project_id)));
  protected readonly projectValues = computed(() => this.projectWork().map(p => p.minutes));

  // Slice colors from each project's color_token so the donut matches project
  // accents everywhere else in the UI. Unassigned is deliberately grey — it's
  // an attribution gap, not a project. Colorless projects fall back to the
  // chart's own palette (null entry).
  protected readonly projectColors = computed(() => this.projectWork().map(p =>
    p.project_id === null
      ? UNASSIGNED_COLOR
      : this.projects.getById(p.project_id)?.color_token ?? null));

  // ── Day view ──────────────────────────────────────────────────────────────
  protected readonly hourlyLabels = HOUR_LABELS;
  protected readonly deskHourly = computed(() =>
    this.isDay() ? hourlyUnionMinutes(this.deskSpans(), dateFromDayKey(this.safeKey()).getTime()) : []);

  // ── Week/month view ───────────────────────────────────────────────────────
  protected readonly periodDays = computed<readonly DayKey[]>(() => {
    if (this.isDay()) return [];
    return this.granularity() === 'week' ? daysInWeek(this.safeKey()) : daysInMonth(this.safeKey());
  });

  protected readonly deskPerDay = computed(() => dailyUnionMinutes(
    this.deskSpans(),
    this.periodDays().map(d => ({
      startMs: dateFromDayKey(d).getTime(),
      endMs: dateFromDayKey(shiftDay(d, 1)).getTime(),
    })),
  ));

  protected readonly pomosPerDay = computed(() => {
    const days = this.periodDays();
    const index = new Map(days.map((d, i) => [d, i] as const));
    const buckets = new Array<number>(days.length).fill(0);
    for (const s of this.focusSessions()) {
      if (s.status !== 'completed') continue;
      const idx = index.get(dayKeyOf(s.started_at) ?? '');
      if (idx !== undefined) buckets[idx]++;
    }
    return buckets;
  });

  protected readonly dayLabels = computed(() =>
    this.granularity() === 'week'
      ? this.periodDays().map(d => formatDayShort(d))
      : this.periodDays().map(d => d.slice(-2)));

  protected readonly activeDays = computed(() => this.deskPerDay().filter(m => m > 0).length);

  // Week: clickable per-day cards. Month: heatmap cells shaded by desk time.
  protected readonly dayCells = computed(() => {
    const desk = this.deskPerDay();
    const pomos = this.pomosPerDay();
    const max = Math.max(...desk, 1);
    return this.periodDays().map((d, i) => ({
      key: d,
      label: formatDayShort(d),
      day: d.slice(-2),
      minutes: desk[i] ?? 0,
      pomos: pomos[i] ?? 0,
      intensity: (desk[i] ?? 0) / max,
    }));
  });

  // ── Commits (both granularities) ─────────────────────────────────────────
  protected readonly commitsSummary = computed(() => {
    const events = this.githubEvents();
    if (!events.length) return null;

    const byRepo = new Map<string, RepoBucket>();
    let totalCommits = 0;
    for (const e of events) {
      const repo = e.source ?? 'unknown';
      const commits = (e.payload?.['commits'] as CommitRow[] | undefined) ?? [];
      const bucket: RepoBucket = byRepo.get(repo) ?? { repo, pushes: 0, commits: [] };
      bucket.pushes += 1;
      bucket.commits.push(...commits);
      byRepo.set(repo, bucket);
      totalCommits += commits.length;
    }
    const repos = [...byRepo.values()].sort((a, b) => b.commits.length - a.commits.length);
    for (const r of repos) r.commits.sort((a, b) => a.author_date.localeCompare(b.author_date));
    return { totalPushes: events.length, totalCommits, repoCount: repos.length, repos };
  });

  // Author date over push ts — a single push can carry hours of work, and the
  // per-commit timestamp is closer to when the typing actually happened.
  protected readonly commitsByHour = computed(() => {
    const buckets = new Array<number>(24).fill(0);
    for (const r of this.commitsSummary()?.repos ?? []) {
      for (const c of r.commits) buckets[new Date(c.author_date).getHours()]++;
    }
    return buckets;
  });

  // ── Section chrome ────────────────────────────────────────────────────────
  protected readonly workMeta = computed(() => {
    const parts: string[] = [];
    const desk = this.deskMinutes();
    if (desk) parts.push(formatMinutes(desk) + ' desk');
    if (this.pomosCompleted()) parts.push(pluralise(this.pomosCompleted(), 'pomo'));
    const commits = this.commitsSummary()?.totalCommits ?? 0;
    if (commits) parts.push(pluralise(commits, 'commit'));
    return parts.join(' · ') || 'Nothing logged yet';
  });

  protected readonly codeMeta = computed(() => {
    const cs = this.commitsSummary();
    if (!cs) return '';
    const parts = [pluralise(cs.totalCommits, 'commit')];
    if (cs.repoCount > 1) parts.push(cs.repoCount + ' repos');
    return parts.join(' · ');
  });

  protected readonly hasWork = computed(() =>
    this.deskMinutes() > 0 || this.focusSessions().length > 0 || (this.commitsSummary()?.totalCommits ?? 0) > 0);

  protected readonly workOpen = linkedSignal(() => this.hasWork());
  protected readonly codeOpen = linkedSignal(() => this.commitsSummary() != null);

  // Calendar events only exist on the day bundle.
  protected readonly dayEvents = computed(() => this.isDay() ? (this.bundle()?.events ?? []) : []);

  protected readonly codeLoading = computed(() => this.loading());

  protected readonly formatMinutes = formatMinutes;

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
