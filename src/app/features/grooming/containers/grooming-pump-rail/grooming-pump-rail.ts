import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatDatetime } from '@shared/utils/datetime.utils';
import { UiToggle } from '@shared/components/ui-toggle/ui-toggle';
import { FleetService } from '@features/fleet/data-access/fleet.service';
import {
  PIPELINE_KEYS,
  PipelineControlService,
  type PipelineKey,
} from '@features/pipeline-control/data-access/pipeline-control.service';

/**
 * Whether the pump is alive, what it is doing this second, and the four valves
 * that decide it — on the board those items are moving through.
 *
 * It replaces a strip of four stat cards that reported the *learning* loop
 * (lessons, corrections). Those numbers had read 0 / 0 / 0 for months because
 * `grooming_corrections` stopped being written 74 days ago: a stopped clock
 * taking the widest band on the page, while the thing a reader actually wants
 * to know — is it running right now — was on two other pages.
 *
 * Everything here is composed from services that already existed:
 * PipelineControlService (the `pipeline.*` settings + per-stage queue depth)
 * and FleetService (the 30s dispatch/stats poll). No new endpoints.
 *
 * Lives under containers/ rather than components/ because it owns its own
 * fetches, polling and writes — VAULT-COMMANDS-001 exempts containers for
 * exactly that reason, and the alternative (the board injecting two more
 * services and passing a dozen inputs down) would put pump concerns in a
 * 700-line board that has nothing to do with them.
 */

/** The pump's own stage→skill table — SKILLS in jimbo-api pipeline-pump.ts. */
const STAGE_SKILLS: Record<string, string> = {
  'dispatch/intake-quality': 'intake',
  'dispatch/vault-deep-read': 'deepread',
  'dispatch/vault-classify': 'classify',
  'dispatch/vault-decompose': 'decompose',
};

const STAGE_LABELS: Record<string, string> = {
  intake: 'intake',
  deepread: 'deep read',
  classify: 'classify',
  decompose: 'decompose',
};

/**
 * The grooming_status each stage reads its candidates from — selectCandidates()
 * in pipeline-pump.ts. Named on the rail because it is the join between these
 * depths and the columns below: `intake` and `deep read` both read `ungroomed`,
 * which is why the same 1652 appears twice and is not a duplicate.
 */
const STAGE_READS: Record<string, string> = {
  intake: 'ungroomed',
  deepread: 'ungroomed',
  classify: 'intake_complete',
  decompose: 'classified',
};

/** Matches `pipeline-pump` cron cadence — the source of ticks_per_day. */
const TICK_MINUTES = 30;

/** Groom completions worth showing: enough to read a rhythm, not a log. */
const RECENT_LIMIT = 6;

/** The clock while a run is in flight — the elapsed number is per-second. */
const LIVE_TICK_MS = 1_000;

/**
 * The clock while nothing runs. Idle is the normal state — the pump ticks every
 * 30 minutes and a run lasts about a minute — so "last run 24m ago" is what this
 * band shows almost always, and it has to keep moving or the rail is exactly as
 * static as the strip it replaced.
 */
const IDLE_TICK_MS = 30_000;

interface StageView {
  readonly id: string;
  readonly label: string;
  /** The grooming_status this stage draws from. */
  readonly reads: string;
  readonly key: PipelineKey;
  readonly perTick: number;
  readonly eligible: number | null;
  readonly atStatus: number | null;
  readonly perDay: number;
  readonly drainDays: number | null;
  readonly off: boolean;
}

interface RunView {
  readonly id: string;
  readonly stage: string;
  readonly title: string;
  readonly elapsed: string;
}

interface CompletionView {
  readonly id: string;
  readonly stage: string;
  readonly ago: string;
  readonly at: string;
  readonly duration: string;
  readonly model: string;
  readonly cost: string;
  readonly failed: boolean;
}

type Tone = 'off' | 'working' | 'idle' | 'alert';

@Component({
  selector: 'app-grooming-pump-rail',
  imports: [RouterLink, UiToggle],
  templateUrl: './grooming-pump-rail.html',
  styleUrl: './grooming-pump-rail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-testid': 'grooming-pump-rail' },
})
export class GroomingPumpRail {
  private readonly pipeline = inject(PipelineControlService);
  private readonly fleet = inject(FleetService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly keys = PIPELINE_KEYS;
  protected readonly tickMinutes = TICK_MINUTES;

  protected readonly enabled = this.pipeline.enabled;
  protected readonly savingKey = this.pipeline.savingKey;
  protected readonly ticksPerDay = this.pipeline.ticksPerDay;
  protected readonly groomer = this.pipeline.groomer;

  /** Every relative time on this rail derives from here — see the constructor. */
  private readonly clock = signal(Date.now());

  constructor() {
    // Root singleton with an internal `started` guard, so this is a no-op when
    // the fleet page already has it polling.
    this.fleet.start();

    effect(onCleanup => {
      const live = this.runningRows().length > 0;
      // Re-set on the transition too: the clock has been advancing every 30s, so
      // a run that appears mid-interval would otherwise render 0s and then jump.
      this.clock.set(Date.now());
      const handle = setInterval(
        () => this.clock.set(Date.now()),
        live ? LIVE_TICK_MS : IDLE_TICK_MS,
      );
      onCleanup(() => clearInterval(handle));
    });

    // The queue depths are a snapshot taken at construction; re-read them on the
    // same cadence as the fleet poll so the two bands never disagree by an hour.
    const refresh = setInterval(() => void this.pipeline.loadQueue(), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(refresh));
  }

  private readonly runningRows = computed(() =>
    this.fleet.now().filter(r => r.flow === 'groom'),
  );

  protected readonly liveRuns = computed<RunView[]>(() => {
    const now = this.clock();
    return this.runningRows().map(r => ({
      id: r.id,
      stage: stageLabelOf(r.skill),
      title: r.note_title ?? r.task_id,
      elapsed: elapsed(r.started_at, now),
    }));
  });

  private readonly groomCompletions = computed(() =>
    this.fleet.recent().filter(r => r.flow === 'groom'),
  );

  protected readonly recent = computed<CompletionView[]>(() =>
    this.groomCompletions().slice(0, RECENT_LIMIT).map(r => ({
      id: r.id,
      stage: stageLabelOf(r.skill),
      ago: ago(r.completed_at, this.clock()),
      at: formatDatetime(r.completed_at),
      duration: r.started_at && r.completed_at
        ? elapsed(r.started_at, Date.parse(r.completed_at))
        : '—',
      model: shortModel(r.completed_model),
      cost: formatCost(r.estimated_cost),
      failed: r.status !== 'completed' || r.error_message !== null,
    })),
  );

  /** Undismissed groom failures only — the fleet page owns the whole feed. */
  protected readonly failures = computed(() =>
    this.fleet.failures().filter(f => f.flow === 'groom' && !f.dismissed_at),
  );

  /** Notes holding a grooming lock with no dispatch behind it. */
  protected readonly stuck = computed(() => this.fleet.stuckNotes());

  private readonly lastCompletedAt = computed(
    () => this.groomCompletions()[0]?.completed_at ?? null,
  );

  protected readonly lastRunAgo = computed(() => ago(this.lastCompletedAt(), this.clock()));
  protected readonly lastEnqueueAgo = computed(() =>
    ago(this.fleet.lastPipelineEnqueueAt(), this.clock()),
  );

  /**
   * The worker named by `pipeline.groomer` — not "any busy worker". A pump
   * whose named groomer is absent is stopped however open its valves read.
   */
  protected readonly worker = computed(() => {
    const id = this.groomer();
    return this.fleet.workers().find(w => w.id === id) ?? null;
  });

  protected readonly verdict = computed<{ label: string; tone: Tone }>(() => {
    if (!this.enabled()) return { label: 'Pump stopped', tone: 'off' };
    if (!this.worker()) return { label: `No worker named ${this.groomer()}`, tone: 'alert' };
    const running = this.runningRows().length;
    if (running > 0) {
      return { label: `Grooming ${running} item${running === 1 ? '' : 's'}`, tone: 'working' };
    }
    return { label: 'Running — between ticks', tone: 'idle' };
  });

  protected readonly stages = computed<StageView[]>(() => {
    const perTick: Record<string, number> = {
      intake: this.pipeline.intakePerTick(),
      deepread: this.pipeline.deepreadPerTick(),
      classify: this.pipeline.classifyPerTick(),
      decompose: this.pipeline.decomposePerTick(),
    };
    const keys: Record<string, PipelineKey> = {
      intake: PIPELINE_KEYS.intakePerTick,
      deepread: PIPELINE_KEYS.deepreadPerTick,
      classify: PIPELINE_KEYS.classifyPerTick,
      decompose: PIPELINE_KEYS.decomposePerTick,
    };
    return Object.keys(STAGE_LABELS).map(id => {
      const q = this.pipeline.queueFor(id);
      return {
        id,
        label: STAGE_LABELS[id],
        reads: STAGE_READS[id],
        key: keys[id],
        perTick: perTick[id],
        eligible: q?.eligible ?? null,
        atStatus: q?.at_status ?? null,
        perDay: perTick[id] * this.ticksPerDay(),
        drainDays: this.pipeline.drainDays(id),
        off: perTick[id] <= 0,
      };
    });
  });

  /** Notes the pump can admit per day across every stage — its real ceiling. */
  protected readonly throughputPerDay = computed(() =>
    this.stages().reduce((sum, s) => sum + s.perDay, 0),
  );

  /**
   * What the next tick will actually admit — min(per-tick, eligible) per stage.
   * The per-tick numbers are a ceiling, not a promise: a stage with a wide valve
   * and nothing eligible contributes nothing, and that is the difference between
   * "throttled" and "starved" that a row of settings alone cannot show.
   */
  protected readonly nextTick = computed(() => {
    const parts = this.stages()
      .map(s => ({ label: s.label, n: Math.min(s.perTick, s.eligible ?? 0) }))
      .filter(s => s.n > 0);
    return { parts, total: parts.reduce((sum, s) => sum + s.n, 0) };
  });

  protected isSaving(key: PipelineKey): boolean {
    return this.savingKey() === key;
  }

  protected onToggleEnabled(next: boolean): void {
    void this.pipeline.save(PIPELINE_KEYS.enabled, next);
  }

  protected onStep(key: PipelineKey, current: number, delta: number): void {
    const next = Math.max(0, current + delta);
    if (next !== current) void this.pipeline.save(key, next);
  }
}

function stageLabelOf(skill: string | null): string {
  const stage = skill ? STAGE_SKILLS[skill] : undefined;
  return stage ? STAGE_LABELS[stage] : (skill ?? 'unknown');
}

/**
 * relativeTime() takes its own Date.now(), so a pure pipe over an unchanged
 * string never re-renders — which is precisely how a band goes stale while
 * looking live. Deriving it from a passed `now` makes the dependency explicit
 * (and testable without a fake clock).
 */
function ago(iso: string | null, now: number): string {
  if (!iso) return 'never';
  const abs = Math.max(0, now - Date.parse(iso));
  if (abs < 60_000) return 'just now';
  if (abs < 3_600_000) return `${Math.round(abs / 60_000)}m ago`;
  if (abs < 86_400_000) return `${Math.round(abs / 3_600_000)}h ago`;
  return `${Math.round(abs / 86_400_000)}d ago`;
}

/** "1m 12s" — a running clock, not a rounded "~1m". */
function elapsed(startedAt: string | null, now: number): string {
  if (!startedAt) return '—';
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) return '—';
  const seconds = Math.max(0, Math.round((now - started) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** Tier, not the full id — the rail has no room and the tier is the decision. */
function shortModel(model: string | null): string {
  if (!model) return '—';
  const tier = ['haiku', 'sonnet', 'opus', 'fable'].find(t => model.includes(t));
  return tier ?? model;
}

// null = no pricing row for that model, so the cost is unknown rather than free.
function formatCost(v: number | null): string {
  if (v === null) return '—';
  return v >= 0.005 ? `$${v.toFixed(2)}` : v > 0 ? '<$0.01' : '$0.00';
}
