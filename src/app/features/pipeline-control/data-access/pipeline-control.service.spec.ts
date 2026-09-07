import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, afterEach } from 'vitest';

import { PIPELINE_KEYS, PipelineControlService } from './pipeline-control.service';
import { environment } from '../../../../environments/environment';

// The parsing here is not incidental: the pump JSON.parses these same values and
// falls back to [] on a throw, silently. A scalar written where an array was
// meant therefore reads as "nothing in scope" — indistinguishable from a
// deliberate shutdown. This page exists to make that visible, so it has to fail
// the same way the pump does rather than more cleverly.

describe('PipelineControlService', () => {
  let service: PipelineControlService;
  let http: HttpTestingController;
  const url = `${environment.dashboardApiUrl}/api/settings`;

  // The constructor's load() resolves through firstValueFrom, so the signal is
  // set in a microtask *after* flush() returns. Await before asserting or every
  // computed still reads its default.
  async function init(settings: Record<string, string>): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        PipelineControlService,
      ],
    });
    service = TestBed.inject(PipelineControlService);
    http = TestBed.inject(HttpTestingController);
    http.expectOne(url).flush(settings);
    // The constructor also probes queue depth; leave it unmatched and
    // afterEach's verify() fails on a request the test never asked about.
    http.expectOne(`${environment.dashboardApiUrl}/api/pipeline/queue`)
      .flush({ ts: '2026-08-24T00:00:00Z', stages: [], ticks_per_day: 48 });
    await Promise.resolve();
  }

  /** save() re-reads depth on success, since every lever changes eligibility. */
  async function flushQueueProbe(): Promise<void> {
    await Promise.resolve();
    http.expectOne(`${environment.dashboardApiUrl}/api/pipeline/queue`)
      .flush({ ts: '2026-08-24T00:00:00Z', stages: [], ticks_per_day: 48 });
  }

  /** init(), but with a real stage queue so flow/drain can be exercised. */
  async function initWithQueue(stage: Record<string, unknown>): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        PipelineControlService,
      ],
    });
    service = TestBed.inject(PipelineControlService);
    http = TestBed.inject(HttpTestingController);
    http.expectOne(url).flush({});
    http.expectOne(`${environment.dashboardApiUrl}/api/pipeline/queue`)
      .flush({ ts: '2026-09-07T00:00:00Z', stages: [stage], ticks_per_day: 48 });
    await Promise.resolve();
  }

  afterEach(() => {
    try {
      http.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  describe('array settings', () => {
    it('parses a JSON-encoded array', async () => {
      await init({ [PIPELINE_KEYS.scopeProjects]: '["pmq-bingo","jimbo"]' });
      expect(service.scopeProjects()).toEqual(['pmq-bingo', 'jimbo']);
    });

    it('reads a bare-string array setting as empty, exactly as the pump does', async () => {
      // String(['pmq-bingo']) === 'pmq-bingo' — the brackets vanish. This has
      // bitten production once already; the UI must not paper over it.
      await init({ [PIPELINE_KEYS.scopeProjects]: 'pmq-bingo' });
      expect(service.scopeProjects()).toEqual([]);
    });

    it('treats an unset key as empty rather than erroring', async () => {
      await init({});
      expect(service.scopeProjects()).toEqual([]);
      expect(service.projectlessTypes()).toEqual([]);
    });
  });

  describe('projectlessExcluded', () => {
    it('is true when a project filter is set and no types are admitted', async () => {
      await init({ [PIPELINE_KEYS.scopeProjects]: '["pmq-bingo"]' });
      expect(service.projectlessExcluded()).toBe(true);
    });

    it('is false once a projectless type is admitted', async () => {
      await init({
        [PIPELINE_KEYS.scopeProjects]: '["pmq-bingo"]',
        [PIPELINE_KEYS.scopeIncludeProjectlessTypes]: '["spike"]',
      });
      expect(service.projectlessExcluded()).toBe(false);
    });

    it('is false when no project filter is set — nothing is being excluded', async () => {
      await init({ [PIPELINE_KEYS.scopeProjects]: '[]' });
      expect(service.projectlessExcluded()).toBe(false);
    });
  });

  describe('scalars', () => {
    it('falls back to the pump defaults when unset', async () => {
      await init({});
      expect(service.intakePerTick()).toBe(2);
      expect(service.staleMinutes()).toBe(20);
      expect(service.enabled()).toBe(false);
    });

    it('distinguishes deep-read off from deep-read slow', async () => {
      await init({ [PIPELINE_KEYS.deepreadPerTick]: '0' });
      expect(service.deepreadOff()).toBe(true);

      TestBed.resetTestingModule();
      await init({ [PIPELINE_KEYS.deepreadPerTick]: '1' });
      expect(service.deepreadOff()).toBe(false);
    });

    it('ignores an unparseable number rather than rendering NaN', async () => {
      await init({ [PIPELINE_KEYS.concurrencyCap]: 'lots' });
      expect(service.concurrencyCap()).toBe(1);
    });
  });

  describe('save', () => {
    it('stores the value the API echoes back, not the one sent', async () => {
      await init({});
      const pending = service.save(PIPELINE_KEYS.scopeProjects, ['jimbo']);

      const req = http.expectOne(`${url}/${PIPELINE_KEYS.scopeProjects}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ value: ['jimbo'] });
      // normalizeSettingValue JSON-encodes server-side; trust the echo.
      req.flush({ key: PIPELINE_KEYS.scopeProjects, value: '["jimbo"]' });
      await flushQueueProbe();
      await pending;

      expect(service.scopeProjects()).toEqual(['jimbo']);
    });

    it('toggleInArray removes an entry that is already present', async () => {
      await init({ [PIPELINE_KEYS.scopeProjects]: '["jimbo","localshout"]' });
      const pending = service.toggleInArray(PIPELINE_KEYS.scopeProjects, 'jimbo');

      const req = http.expectOne(`${url}/${PIPELINE_KEYS.scopeProjects}`);
      expect(req.request.body).toEqual({ value: ['localshout'] });
      req.flush({ key: PIPELINE_KEYS.scopeProjects, value: '["localshout"]' });
      await flushQueueProbe();
      await pending;

      expect(service.scopeProjects()).toEqual(['localshout']);
    });

    it('surfaces a failed write instead of silently keeping the old value', async () => {
      await init({});
      const pending = service.save(PIPELINE_KEYS.enabled, true);
      http.expectOne(`${url}/${PIPELINE_KEYS.enabled}`)
        .flush('nope', { status: 500, statusText: 'Server Error' });
      await pending;

      expect(service.error()).toContain(PIPELINE_KEYS.enabled);
      expect(service.enabled()).toBe(false);
      expect(service.savingKey()).toBeNull();
    });
  });

  // The drain estimate used to be eligible / per_day, which assumes nothing new
  // arrives. Measured 2026-09-07: intake cleared 44 items in ten days while
  // decompose created 275, so the queue grew by 231 while the rail displayed a
  // finite, shrinking-looking number.
  describe('queue flow', () => {
    it('reports a growing queue as growing', async () => {
      await initWithQueue({ stage: 'intake', at_status: 317, eligible: 317, per_tick: 1, arrived_7d: 190, cleared_7d: 30 });
      expect(service.netFlow7d('intake')).toBe(160);
    });

    it('refuses a drain estimate while more arrives than leaves', async () => {
      await initWithQueue({ stage: 'intake', at_status: 317, eligible: 317, per_tick: 1, arrived_7d: 190, cleared_7d: 30 });
      expect(service.drainDays('intake')).toBeNull();
    });

    it('gives no drain estimate for a queue holding exactly level', async () => {
      await initWithQueue({ stage: 'intake', at_status: 100, eligible: 100, per_tick: 1, arrived_7d: 50, cleared_7d: 50 });
      expect(service.netFlow7d('intake')).toBe(0);
      expect(service.drainDays('intake')).toBeNull();
    });

    // net -35/week = 5/day, so 70 eligible takes 14 days — the per-tick ceiling
    // (48/day) would have claimed 2.
    it('estimates the drain from observed flow, not the per-tick ceiling', async () => {
      await initWithQueue({ stage: 'intake', at_status: 70, eligible: 70, per_tick: 1, arrived_7d: 5, cleared_7d: 40 });
      expect(service.drainDays('intake')).toBe(14);
    });

    it('falls back to the per-tick ceiling when the API sends no flow data', async () => {
      await initWithQueue({ stage: 'intake', at_status: 96, eligible: 96, per_tick: 1 });
      expect(service.netFlow7d('intake')).toBeNull();
      expect(service.drainDays('intake')).toBe(2); // 96 eligible / 48 per day
    });

    it('has nothing to drain when the queue is empty', async () => {
      await initWithQueue({ stage: 'intake', at_status: 0, eligible: 0, per_tick: 1, arrived_7d: 0, cleared_7d: 0 });
      expect(service.drainDays('intake')).toBeNull();
    });
  });
});