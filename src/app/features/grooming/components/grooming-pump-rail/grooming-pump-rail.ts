import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiTimestamp } from '@shared/components/ui-timestamp/ui-timestamp';
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

/** Matches `pipeline-pump` cron cadence — the source of ticks_per_day. */
const TICK_MINUTES = 30;

/** Groom completions worth showing: enough to read a rhythm, not a log. */
const RECENT_LIMIT = 6;

interface StageView {
  readonly id: string;
  readonly label: string;
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
  readonly at: string | null;
  readonly duration: string;
  readonly model: string;
  readonly cost: string;
  readonly failed: boolean;
}

type Tone = 'off' | 'working' | 'idle' | 'alert';

@Component({
  selector: 'app-grooming-pump-rail',
  imports: [RouterLink, UiTimestamp, UiToggle],
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
  protected readonly lastEnqueueAt = this.fleet.lastPipelineEnqueueAt;
  protected readonly groomer = this.pipeline.groomer;

  /** Ticks only while something is running — see the effect in the constructor. */
  private readonly clock = signal(Date.now());

  constructor() {
    // Root singleton with an internal `started` guard, so this is a no-op when
    // the fleet page already has it polling.
    this.fleet.start();

    effect(onCleanup => {
      if (this.runningRows().length === 0) return;
      const handle = setInterval(() => this.clock.set(Date.now()), 1000);
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
      at: r.completed_at,
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

  protected readonly lastCompletedAt = computed(
    () => this.groomCompletions()[0]?.completed_at ?? null,
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
