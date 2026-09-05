import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { FleetBoard } from './fleet-board';
import type { ApiFleetStats, FleetMachine, FleetWorker } from '@domain/dispatch';

const NOW = Date.parse('2026-09-04T17:09:00Z');

function agoMin(mins: number): string {
  return new Date(NOW - mins * 60_000).toISOString();
}

function worker(id: string, machine: string | null, checkedAt: string | null): FleetWorker {
  return { id, machine, status: 'polling', checked_at: checkedAt, next_poll_at: null, reason: null, suspended: null };
}

function machine(id: string, stale: boolean, workers: string[], lastSeen: string | null): FleetMachine {
  return { id, last_seen_at: lastSeen, workers, stale, stale_after_minutes: id === 'm4' ? 1440 : 10, suspended: false };
}

function stats(workers: FleetWorker[], machines: FleetMachine[]): ApiFleetStats {
  return {
    generated_at: new Date(NOW).toISOString(),
    queue: [], workers, machines, recent: [], burn_5h: [], folds: [],
    now: [], failures_24h: [], stuck_notes: [], last_pipeline_enqueue_at: null,
  };
}

describe('FleetBoard — attributing silence to the right thing', () => {
  let board: FleetBoard;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    board = TestBed.runInInjectionContext(() => new FleetBoard());
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // FleetBoard also injects HermesService, which polls its own endpoint.
    // That is not what this spec is about, so drain whatever is outstanding
    // rather than assert on it.
    http.match(() => true).forEach(req => req.flush({}));
    http.verify();
    vi.useRealTimers();
  });

  /**
   * Flush the service's first poll.
   *
   * refresh() awaits the response, so the signal is written in a microtask
   * after the flush — advance the (faked) clock by zero to drain them before
   * asserting on anything derived from it.
   */
  async function load(body: ApiFleetStats): Promise<void> {
    http.expectOne(req => req.url.endsWith('/api/dispatch/stats')).flush(body);
    await vi.advanceTimersByTimeAsync(0);
  }

  it('lets the machine own the alarm when the whole box is down', async () => {
    // The 2026-09-04 shape: the M2 asleep, all three of its workers silent.
    // Three "silent" worker badges plus a stale machine is four alarms for one
    // fact, which is how the page stopped meaning anything.
    await load(stats(
      [worker('boris', 'm2', agoMin(25)), worker('jeffrey', 'm2', agoMin(25)), worker('steward', 'm2', agoMin(25))],
      [machine('m2', true, ['boris', 'jeffrey', 'steward'], agoMin(25))],
    ));

    const boris = board.workers()[0];
    expect(board.workerCoveredByMachine(boris)).toBe(true);
    expect(board.workerIsAloneInSilence(boris)).toBe(false);
    expect(board.staleMachines().map(m => m.id)).toEqual(['m2']);
  });

  it('names the worker when its machine is demonstrably up', async () => {
    // boris is hung; jeffrey and steward keep checking in from the same box.
    // This is the case the machine roll-up exists to separate out.
    await load(stats(
      [worker('boris', 'm2', agoMin(90)), worker('jeffrey', 'm2', agoMin(1)), worker('steward', 'm2', agoMin(1))],
      [machine('m2', false, ['boris', 'jeffrey', 'steward'], agoMin(1))],
    ));

    const boris = board.workers()[0];
    expect(board.workerIsAloneInSilence(boris)).toBe(true);
    expect(board.workerCoveredByMachine(boris)).toBe(false);
    expect(board.staleMachines()).toEqual([]);
  });

  it('does not accuse a healthy worker of anything', async () => {
    await load(stats([worker('jeffrey', 'm2', agoMin(1))], [machine('m2', false, ['jeffrey'], agoMin(1))]));

    const jeffrey = board.workers()[0];
    expect(board.workerIsAloneInSilence(jeffrey)).toBe(false);
    expect(board.workerCoveredByMachine(jeffrey)).toBe(false);
  });

  it('tones a suspended machine as deliberate quiet, not as an outage', async () => {
    await load(stats([worker('boris', 'm2', agoMin(300))],
      [{ ...machine('m2', false, ['boris'], agoMin(300)), suspended: true }]));

    expect(board.machineTone(board.machines()[0])).toBe('quiet');
  });

  it('renders nothing at all rather than an empty machine when the API predates the field', async () => {
    // An older API sends no `machines` key; the schema defaults it to [] and
    // the strip must simply not appear.
    const older = { ...stats([worker('boris', 'm2', agoMin(1))], []) } as Record<string, unknown>;
    delete older['machines'];
    await load(older as unknown as ApiFleetStats);

    expect(board.machines()).toEqual([]);
    expect(board.workerCoveredByMachine(board.workers()[0])).toBe(false);
  });
});
