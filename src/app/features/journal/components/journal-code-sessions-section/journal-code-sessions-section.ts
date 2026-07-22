import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { absoluteTime, formatMinutes, pluralise } from '@shared/utils/datetime.utils';
import { PROJECTS_READ } from '../../../projects/data-access/projects.read';
import type {
  CodeSession,
  CodeSessionOutcome,
  FrictionLevel,
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
  private readonly projects = inject(PROJECTS_READ);

  // Fetched once by the day page (shared with the timeline + Work rollup).
  readonly sessions = input.required<readonly CodeSession[]>();
  readonly loading = input<boolean>(false);

  private readonly ordered = computed<CodeSession[]>(() =>
    [...this.sessions()].sort((a, b) => a.started_at.localeCompare(b.started_at)),
  );

  readonly open = linkedSignal(() => this.loading() || this.ordered().length > 0);

  readonly rows = computed<SessionRow[]>(() => this.ordered().map(s => ({
    id: s.id,
    // Running sessions end at their last heartbeat with a trailing ellipsis —
    // "still open, last active then" — rather than pretending to reach "now".
    timeLabel: `${absoluteTime(s.started_at)} – ${
      s.ended_at ? absoluteTime(s.ended_at)
      : s.last_seen_at ? `${absoluteTime(s.last_seen_at)}…`
      : 'now'}`,
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

  // Long-open running sessions (terminal left open for hours) have no honest
  // duration — their envelope is idle time, so they're excluded from the
  // total rather than counted at 10+ hours. Surfaced via openEnvelopeCount.
  readonly totalMinutes = computed(() =>
    this.sessions().reduce((sum, s) => sum + (isOpenEnvelope(s) ? 0 : effectiveMinutes(s)), 0));

  readonly openEnvelopeCount = computed(() => this.sessions().filter(isOpenEnvelope).length);

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

// Running longer than this = a terminal left open, not one work stretch.
const OPEN_ENVELOPE_MINUTES = 3 * 60;

function isOpenEnvelope(s: CodeSession): boolean {
  return s.status === 'running' && effectiveMinutes(s) > OPEN_ENVELOPE_MINUTES;
}

// duration_minutes is null while a session is running (and on unreaped
// strays); fall back to the span up to the last heartbeat — the latest
// EVIDENCE of activity — so an idle-but-open terminal doesn't keep
// inflating the day's desk time. Wall-clock "now" is the last resort only.
function effectiveMinutes(s: CodeSession): number {
  if (s.duration_minutes != null) return s.duration_minutes;
  const end = s.ended_at ?? s.last_seen_at;
  const endMs = end ? new Date(end).getTime() : Date.now();
  return Math.max(0, Math.round((endMs - new Date(s.started_at).getTime()) / 60_000));
}
