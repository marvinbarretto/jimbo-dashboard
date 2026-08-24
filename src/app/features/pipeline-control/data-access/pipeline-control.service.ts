// Reads and writes the `pipeline.*` settings that gate the grooming pump.
//
// These thirteen keys decide what may be groomed, what may be commissioned, and
// how fast — and until now the only way to see them was to curl thirteen
// endpoints one at a time. That opacity has cost real time: on 2026-08-24 a
// session spent an hour diagnosing a "stall" that was `scope_projects` set to
// a single project, working exactly as intended.
//
// Settings API: GET /api/settings returns a flat key→value map (values are
// strings, arrays JSON-encoded); PUT /api/settings/{key} takes { value }.

import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type PipelineScope = 'all' | 'priority_1_only';

export interface StageQueue {
  stage: string;
  /** Everything sitting at this stage's grooming_status. */
  at_status: number;
  /** What the pump would actually admit right now. */
  eligible: number;
  per_tick: number;
}

export interface PipelineQueue {
  ts: string;
  stages: StageQueue[];
  ticks_per_day: number;
}

/** The one place the key strings live. Mirrors `SETTINGS` in pipeline-pump.ts. */
export const PIPELINE_KEYS = {
  enabled: 'pipeline.enabled',
  scope: 'pipeline.scope',
  scopeProjects: 'pipeline.scope_projects',
  scopeIncludeProjectlessTypes: 'pipeline.scope_include_projectless_types',
  autonomousProjects: 'pipeline.autonomous_projects',
  concurrencyCap: 'pipeline.concurrency_cap',
  intakePerTick: 'pipeline.intake_items_per_tick',
  deepreadPerTick: 'pipeline.deepread_items_per_tick',
  classifyPerTick: 'pipeline.classify_items_per_tick',
  decomposePerTick: 'pipeline.decompose_items_per_tick',
  staleMinutes: 'pipeline.stale_minutes',
  maxRetries: 'pipeline.max_retries',
  groomer: 'pipeline.groomer',
  orchestrator: 'pipeline.orchestrator',
} as const;

export type PipelineKey = (typeof PIPELINE_KEYS)[keyof typeof PIPELINE_KEYS];

/** Defaults mirror DEFAULTS in pipeline-pump.ts — an unset key is not an error. */
const DEFAULTS = {
  enabled: false,
  scope: 'all' as PipelineScope,
  concurrencyCap: 1,
  intakePerTick: 2,
  deepreadPerTick: 1,
  classifyPerTick: 1,
  decomposePerTick: 1,
  staleMinutes: 20,
  maxRetries: 2,
};

/**
 * The pump JSON.parses these and falls back to [] on a throw — silently. A
 * scalar written where an array was meant therefore reads as "nothing in
 * scope", which is indistinguishable from a deliberate shutdown. Parse the
 * same way here so the UI shows what the pump will actually see, not what we
 * hoped was stored.
 */
function parseStringArray(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function parseInt10(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

@Injectable({ providedIn: 'root' })
export class PipelineControlService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  private readonly _queue = signal<PipelineQueue | null>(null);
  readonly queue = this._queue.asReadonly();

  private readonly _settings = signal<Record<string, string>>({});
  private readonly _loading = signal(true);
  private readonly _saving = signal<PipelineKey | null>(null);
  private readonly _error = signal<string | null>(null);

  readonly isLoading = this._loading.asReadonly();
  /** Which key is mid-flight, so only that control shows a pending state. */
  readonly savingKey = this._saving.asReadonly();
  readonly error = this._error.asReadonly();

  readonly enabled = computed(() => this.raw(PIPELINE_KEYS.enabled) === 'true');
  readonly scope = computed<PipelineScope>(() =>
    this.raw(PIPELINE_KEYS.scope) === 'priority_1_only' ? 'priority_1_only' : DEFAULTS.scope,
  );
  readonly scopeProjects = computed(() => parseStringArray(this.raw(PIPELINE_KEYS.scopeProjects)));
  readonly autonomousProjects = computed(() =>
    parseStringArray(this.raw(PIPELINE_KEYS.autonomousProjects)),
  );
  readonly projectlessTypes = computed(() =>
    parseStringArray(this.raw(PIPELINE_KEYS.scopeIncludeProjectlessTypes)),
  );

  readonly concurrencyCap = computed(() =>
    parseInt10(this.raw(PIPELINE_KEYS.concurrencyCap), DEFAULTS.concurrencyCap),
  );
  readonly intakePerTick = computed(() =>
    parseInt10(this.raw(PIPELINE_KEYS.intakePerTick), DEFAULTS.intakePerTick),
  );
  readonly deepreadPerTick = computed(() =>
    parseInt10(this.raw(PIPELINE_KEYS.deepreadPerTick), DEFAULTS.deepreadPerTick),
  );
  readonly classifyPerTick = computed(() =>
    parseInt10(this.raw(PIPELINE_KEYS.classifyPerTick), DEFAULTS.classifyPerTick),
  );
  readonly decomposePerTick = computed(() =>
    parseInt10(this.raw(PIPELINE_KEYS.decomposePerTick), DEFAULTS.decomposePerTick),
  );
  readonly staleMinutes = computed(() =>
    parseInt10(this.raw(PIPELINE_KEYS.staleMinutes), DEFAULTS.staleMinutes),
  );
  readonly maxRetries = computed(() =>
    parseInt10(this.raw(PIPELINE_KEYS.maxRetries), DEFAULTS.maxRetries),
  );

  readonly groomer = computed(() => this.raw(PIPELINE_KEYS.groomer) ?? 'unset');
  readonly orchestrator = computed(() => this.raw(PIPELINE_KEYS.orchestrator) ?? 'unset');

  /**
   * Deep-read at 0 is not "slow", it is off — and when it is off intake absorbs
   * its candidates rather than notes queueing behind a stage that never runs.
   * Worth saying out loud on the page; a zero in a row of numbers reads as a
   * throttle, not a switch.
   */
  readonly deepreadOff = computed(() => this.deepreadPerTick() <= 0);

  /**
   * A note with no project row cannot satisfy the pump's project IN-clause, so
   * while `scope_projects` is non-empty, projectless notes are excluded unless
   * their type is listed. True here means some are silently invisible.
   */
  readonly projectlessExcluded = computed(
    () => this.scopeProjects().length > 0 && this.projectlessTypes().length === 0,
  );

  constructor() {
    void this.load();
    void this.loadQueue();
  }

  /** Depth is derived from settings, so a saved lever invalidates it. */
  async loadQueue(): Promise<void> {
    try {
      this._queue.set(
        await firstValueFrom(this.http.get<PipelineQueue>(`${this.base}/api/pipeline/queue`)),
      );
    } catch {
      this._queue.set(null);
    }
  }

  queueFor(stage: string): StageQueue | null {
    return this._queue()?.stages.find(s => s.stage === stage) ?? null;
  }

  readonly ticksPerDay = computed(() => this._queue()?.ticks_per_day ?? 0);

  /**
   * Days to clear a stage's eligible backlog at its current rate. Null when the
   * rate is 0 (never drains) or there is nothing waiting — both of which are
   * states a number would misrepresent as progress.
   */
  drainDays(stage: string): number | null {
    const q = this.queueFor(stage);
    const perDay = (q?.per_tick ?? 0) * this.ticksPerDay();
    if (!q || q.eligible === 0 || perDay <= 0) return null;
    return Math.ceil(q.eligible / perDay);
  }

  private raw(key: PipelineKey): string | undefined {
    return this._settings()[key];
  }

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const map = await firstValueFrom(
        this.http.get<Record<string, string>>(`${this.base}/api/settings`),
      );
      this._settings.set(map ?? {});
    } catch {
      this._error.set('Could not load pipeline settings.');
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Writes one key, then re-reads it from the response rather than assuming the
   * write landed as sent — `normalizeSettingValue` on the API coerces, and a
   * silently-coerced value is exactly the failure this page exists to expose.
   */
  async save(key: PipelineKey, value: string | number | boolean | string[]): Promise<void> {
    this._saving.set(key);
    this._error.set(null);
    try {
      const saved = await firstValueFrom(
        this.http.put<{ key: string; value: string }>(`${this.base}/api/settings/${key}`, { value }),
      );
      this._settings.update(s => ({ ...s, [key]: saved.value }));
      await this.loadQueue();
    } catch {
      this._error.set(`Could not save ${key}.`);
    } finally {
      this._saving.set(null);
    }
  }

  /** Add or remove one entry in an array-valued setting. */
  async toggleInArray(key: PipelineKey, entry: string): Promise<void> {
    const current = parseStringArray(this.raw(key));
    const next = current.includes(entry)
      ? current.filter(e => e !== entry)
      : [...current, entry];
    await this.save(key, next);
  }
}
