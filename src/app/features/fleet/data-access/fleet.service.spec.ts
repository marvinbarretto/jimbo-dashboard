import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { FleetService } from './fleet.service';
import type { ApiFleetStats, FleetFailure } from '@domain/dispatch';

// Minimal valid ApiFleetStats — schema requires every top-level array field
// (the optional ones default via Zod, but supplying them keeps fixtures
// explicit about what each test is asserting on).
function stats(failures: FleetFailure[]): ApiFleetStats {
  return {
    generated_at: '2026-08-24T14:00:00Z',
    queue: [],
    workers: [],
    machines: [],
    recent: [],
    burn_5h: [],
    folds: [],
    now: [],
    failures_24h: failures,
    stuck_notes: [],
    last_pipeline_enqueue_at: null,
  };
}

function failure(overrides: Partial<FleetFailure> = {}): FleetFailure {
  return {
    id: '1',
    task_id: 'note-1',
    note_title: 'Define detection strategy',
    skill: 'vault-grooming/decompose',
    flow: 'groom',
    executor: 'boris',
    error_message: 'note sits 2 levels below epic',
    retry_count: 0,
    completed_at: '2026-08-24T13:25:41Z',
    dismissed_at: null,
    ...overrides,
  };
}

// Same repeated grooming retry from the screenshot that prompted this: five
// rows, same note_title, different ids/timestamps/wording. `first` is the
// most recent (index 0 — failures_24h arrives completed_at DESC).
const RETRY_ROWS: FleetFailure[] = [
  failure({ id: '5', completed_at: '2026-08-24T13:25:41Z', error_message: 'note sits 2 levels below epic; subtasks would…' }),
  failure({ id: '4', completed_at: '2026-08-24T12:55:36Z', error_message: 'note already sits 2 levels below epic (max de…' }),
  failure({ id: '3', completed_at: '2026-08-24T12:24:55Z', error_message: 'note sits 2 le…' }),
  failure({ id: '2', completed_at: '2026-08-24T11:54:54Z', error_message: 'note sits 2 levels below epic; subtasks would…' }),
  failure({ id: '1', completed_at: '2026-08-24T11:24:42Z', error_message: 'note sits at depth 2 below epic (exceeds max …' }),
];

describe('FleetService notification grouping + dismiss', () => {
  let service: FleetService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(FleetService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function loadFailures(failures: FleetFailure[]): Promise<void> {
    const p = service.refresh();
    http.expectOne(r => r.url.includes('/api/dispatch/stats')).flush(stats(failures));
    await p;
  }

  it('collapses repeat failures on the same note into one notification, carrying the most recent id', async () => {
    await loadFailures(RETRY_ROWS);

    expect(service.notifications().length).toBe(1);
    const entry = service.notifications()[0];
    expect(entry.id).toBe('5');
    expect(entry.count).toBe(5);
  });

  it('keeps distinct notes as separate rows', async () => {
    await loadFailures([
      ...RETRY_ROWS,
      failure({ id: '99', task_id: 'briefing-morning', note_title: null, flow: 'recon', error_message: 'Anthropic overloaded' }),
    ]);

    expect(service.notifications().length).toBe(2);
  });

  // The state from the screenshot that started this: seven different grooming
  // notes, each timing out on the same reaper, filling the bar with seven rows.
  // Distinct notes, so per-note grouping cannot help — that is one broken thing
  // reported seven times.
  it('collapses a storm of distinct notes under one skill into a single row', async () => {
    await loadFailures([
      failure({ id: '10', task_id: 'note-a', note_title: 'Design the detection algorithm', error_message: 'reaper: timeout' }),
      failure({ id: '11', task_id: 'note-b', note_title: 'Implement signal extraction', error_message: 'reaper: timeout' }),
      failure({ id: '12', task_id: 'note-c', note_title: 'Integrate configuration system', error_message: 'reaper: timeout' }),
    ]);

    expect(service.notifications().length).toBe(1);
    const entry = service.notifications()[0];
    expect(entry.message).toContain('3 notes');
    // Keyed to a real dispatch id, so dismissing the storm still round-trips.
    expect(entry.id).toBe('10');
  });

  // Restraint is the point: two failures that merely share a skill are two
  // problems, and collapsing them would hide one behind the other.
  it('leaves a pair of distinct notes as separate rows', async () => {
    await loadFailures([
      failure({ id: '10', task_id: 'note-a', note_title: 'Design the detection algorithm' }),
      failure({ id: '11', task_id: 'note-b', note_title: 'Implement signal extraction' }),
    ]);

    expect(service.notifications().length).toBe(2);
  });

  it('dismiss() on the collapsed entry dismisses every underlying failure in the group', async () => {
    await loadFailures(RETRY_ROWS);

    const dismissPromise = service.dismiss('5');
    // Optimistic update already collapsed the group before any request lands.
    expect(service.notifications().length).toBe(0);

    const reqs = RETRY_ROWS.map(f => http.expectOne(r => r.url.includes(`/api/dispatch/${f.id}/dismiss`)));
    reqs.forEach(r => r.flush({ id: Number(r.request.url.split('/').at(-2)), dismissed_at: '2026-08-24T14:00:00Z' }));
    await dismissPromise;

    expect(service.notifications().length).toBe(0);
  });

  it('dismissAll() clears every visible (grouped) notification', async () => {
    await loadFailures([
      ...RETRY_ROWS,
      failure({ id: '99', task_id: 'briefing-morning', note_title: null, flow: 'recon', error_message: 'Anthropic overloaded' }),
    ]);
    expect(service.notifications().length).toBe(2);

    const dismissAllPromise = service.dismissAll();
    expect(service.notifications().length).toBe(0);

    const allIds = [...RETRY_ROWS.map(f => f.id), '99'];
    allIds.forEach(id => {
      const req = http.expectOne(r => r.url.includes(`/api/dispatch/${id}/dismiss`));
      req.flush({ id: Number(id), dismissed_at: '2026-08-24T14:00:00Z' });
    });
    await dismissAllPromise;

    expect(service.notifications().length).toBe(0);
  });
});
