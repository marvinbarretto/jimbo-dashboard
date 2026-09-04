import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { HermesService } from './hermes.service';
import type { HermesJob, HermesSnapshot } from '../hermes.types';

/** A healthy scheduled job; fixtures override only what they assert on. */
function job(overrides: Partial<HermesJob> = {}): HermesJob {
  return {
    id: 'j1',
    name: 'a-job',
    state: 'scheduled',
    enabled: true,
    health: 'ok',
    schedule_display: 'every 15m',
    paused_at: null,
    paused_reason: null,
    last_run_at: '2026-09-04T17:01:38Z',
    next_run_at: '2026-09-04T17:16:38Z',
    last_status: 'ok',
    last_error: null,
    last_delivery_error: null,
    runs_completed: 10,
    skill: null,
    script: null,
    deliver: null,
    prompt: null,
    skills: null,
    model: null,
    provider: null,
    created_at: null,
    ...overrides,
  };
}

function snapshot(jobs: HermesJob[], counts: Partial<HermesSnapshot> = {}): HermesSnapshot {
  return {
    jobs,
    total: jobs.length,
    paused_count: jobs.filter(j => j.state === 'paused').length,
    failing_count: jobs.filter(j => j.health === 'failing').length,
    stale_error_count: jobs.filter(j => j.health === 'stale_error').length,
    source: '/home/jimbo/.hermes/cron/jobs.json',
    last_modified: '2026-09-04T17:09:00Z',
    read_at: '2026-09-04T17:09:18Z',
    ...counts,
  };
}

describe('HermesService', () => {
  let service: HermesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HermesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /**
   * Flush the poll's first request with a payload.
   *
   * The service polls on `timer(0, 10_000)`, and even a zero-delay timer fires
   * on a macrotask — so the request does not exist yet when the test body
   * starts. Yield once before asserting on it.
   */
  async function load(body: HermesSnapshot): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 0));
    http.expectOne(req => req.url.endsWith('/api/hermes/jobs')).flush(body);
  }

  it('does not count a scheduled-but-disabled job as active', async () => {
    // vault-analyse reads `state: scheduled, enabled: false` and has not fired
    // since June. Counting it as active is why nothing noticed.
    await load(snapshot([
      job({ name: 'assignment-watch' }),
      job({ id: 'j2', name: 'vault-analyse', enabled: false, health: 'disabled' }),
    ]));

    expect(service.activeCount()).toBe(1);
    expect(service.disabledCount()).toBe(1);
  });

  it('keeps a stale error out of the failing count', async () => {
    // The live 2026-09-04 shape: 46 clean jobs and one paused job holding a
    // July OpenRouter 402. The page rendered that as FAILING for 42 days.
    await load(snapshot([
      job(),
      job({
        id: 'j2',
        name: 'mood-checkin-tick',
        state: 'paused',
        enabled: false,
        health: 'stale_error',
        last_status: 'error',
        paused_at: '2026-07-24T19:57:04Z',
        last_run_at: '2026-07-24T19:40:13Z',
      }),
    ]));

    expect(service.failingCount()).toBe(0);
    expect(service.staleErrorCount()).toBe(1);
    expect(service.oldestStaleError()?.name).toBe('mood-checkin-tick');
  });

  it('picks the oldest stale error, so the date shown is the worst one', async () => {
    await load(snapshot([
      job({ id: 'a', name: 'recent-stale', health: 'stale_error', last_status: 'error', paused_at: '2026-08-05T01:10:43Z' }),
      job({ id: 'b', name: 'ancient-stale', health: 'stale_error', last_status: 'error', paused_at: '2026-06-08T12:39:18Z' }),
    ]));

    expect(service.oldestStaleError()?.name).toBe('ancient-stale');
  });

  it('reports nothing wrong when every job is clean', async () => {
    await load(snapshot([job(), job({ id: 'j2' })]));

    expect(service.failingCount()).toBe(0);
    expect(service.staleErrorCount()).toBe(0);
    expect(service.oldestStaleError()).toBeNull();
  });
});
