import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { absoluteTime, formatMinutes, pluralise } from '@shared/utils/datetime.utils';
import { type DayKey, dateFromDayKey, shiftDay } from '@shared/utils/date-keys';
import { catchError, of, switchMap, timer } from 'rxjs';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import {
  CodeSessionsService,
  type CodeSession,
  type CodeSessionOutcome,
  type FrictionLevel,
} from '../../data-access/code-sessions.service';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const OUTCOME_TONE: Record<CodeSessionOutcome, Tone> = {
  completed: 'success',
  partial: 'warning',
  abandoned: 'danger',
  unknown: 'neutral',
};

interface SessionRow {
  readonly id: string;
  readonly timeLabel: string; // "14:05 – 15:32" or "14:05 – now"
  readonly durationLabel: string;
  readonly repoShort: string | null;
  readonly branch: string | null;
  readonly actor: string | null;
  readonly projectName: string | null;
  readonly running: boolean;
  readonly outcome: CodeSessionOutcome | null;
  readonly headline: string;
  readonly bullets: readonly string[];
  readonly nextSteps: readonly string[];
  readonly commitCount: number;
  readonly filesTouched: number;
  readonly frictionLevel: FrictionLevel | null;
}

@Component({
  selector: 'app-journal-code-sessions-section',
  imports: [
    UiBadge,
    UiEmptyState,
    UiLoadingState,
    UiSection,
    UiStack,
    UiStatCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-code-sessions-section.html',
  styleUrl: './journal-code-sessions-section.scss',
})
export class JournalCodeSessionsSection {
  private readonly service = inject(CodeSessionsService);
  private readonly projects = inject(ProjectsService);

  readonly date = input.required<DayKey>();

  // Local-midnight day window, matching the journal's bucketing convention
  // (started_at is UTC; the day a session "belongs to" is the local calendar
  // day it started in). Refetch immediately on day navigation, then every
  // 60s so a running session's elapsed time stays roughly current.
  private readonly result = toSignal(
    toObservable(this.date).pipe(
      switchMap((date) => timer(0, 60_000).pipe(
        switchMap(() => this.service.list({
          since: dateFromDayKey(date).toISOString(),
          until: dateFromDayKey(shiftDay(date, 1)).toISOString(),
        }).pipe(catchError(() => of({ items: [] as CodeSession[] })))),
      )),
    ),
    { initialValue: null },
  );

  readonly loading = computed(() => this.result() === null);

  private readonly sessions = computed<CodeSession[]>(() =>
    [...(this.result()?.items ?? [])].sort((a, b) => a.started_at.localeCompare(b.started_at)),
  );

  readonly open = linkedSignal(() => this.loading() || this.sessions().length > 0);

  readonly rows = computed<SessionRow[]>(() => this.sessions().map(s => ({
    id: s.id,
    timeLabel: `${absoluteTime(s.started_at)} – ${s.ended_at ? absoluteTime(s.ended_at) : 'now'}`,
    durationLabel: formatMinutes(effectiveMinutes(s)),
    repoShort: s.repo ? (s.repo.split('/').at(-1) ?? s.repo) : null,
    branch: s.branch,
    actor: s.actor,
    projectName: s.project_id ? (this.projects.getById(s.project_id)?.display_name ?? null) : null,
    running: s.status === 'running',
    outcome: s.status === 'running' ? null : s.outcome,
    headline: s.headline ?? (s.status === 'running' ? 'In progress…' : '(no summary captured)'),
    bullets: s.bullets,
    nextSteps: s.next_steps,
    commitCount: s.artifacts.commits.length,
    filesTouched: s.artifacts.files_touched,
    frictionLevel: s.friction && s.friction.level !== 'low' ? s.friction.level : null,
  })));

  readonly totalMinutes = computed(() =>
    this.sessions().reduce((sum, s) => sum + effectiveMinutes(s), 0));

  readonly totalCommits = computed(() =>
    this.sessions().reduce((sum, s) => sum + s.artifacts.commits.length, 0));

  readonly reposTouched = computed(() => {
    const repos = new Set<string>();
    for (const s of this.sessions()) if (s.repo) repos.add(s.repo);
    return repos.size;
  });

  readonly interactiveCount = computed(() => this.sessions().filter(s => !s.actor).length);
  readonly executorCount = computed(() => this.sessions().filter(s => !!s.actor).length);

  readonly sectionMeta = computed(() => {
    const n = this.sessions().length;
    if (n === 0) return 'no sessions';
    return `${pluralise(n, 'session')} · ${formatMinutes(this.totalMinutes())}`;
  });

  outcomeTone(o: CodeSessionOutcome): Tone { return OUTCOME_TONE[o]; }
  frictionTone(level: FrictionLevel): Tone { return level === 'high' ? 'danger' : 'warning'; }
}

// duration_minutes is null while a session is running (and on unreaped
// strays); fall back to wall-clock elapsed so today's active session still
// counts toward the day's total.
function effectiveMinutes(s: CodeSession): number {
  if (s.duration_minutes != null) return s.duration_minutes;
  const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
  return Math.max(0, Math.round((end - new Date(s.started_at).getTime()) / 60_000));
}
