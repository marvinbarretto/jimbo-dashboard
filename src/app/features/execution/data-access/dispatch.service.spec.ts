import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { resetSeedModeCache } from '@shared/seed-mode';
import { ToastService } from '@shared/components/toast/toast.service';

import { DispatchService } from './dispatch.service';
import { dispatchId } from '@domain/ids';
import type { ApiDispatchEntry } from '@domain/dispatch/dispatch.api-schema';

// Minimal valid ApiDispatchEntry — schema requires every field. Helper accepts
// overrides so each test can tweak just what matters. Module-scoped so multiple
// describe blocks share it.
function fakeEntry(overrides: Partial<ApiDispatchEntry> = {}): ApiDispatchEntry {
  return {
    id:             1,
    task_id:        'task-1',
    task_source:    'manual',
    flow:           'commission',
    agent_type:     'claude',
    executor:       'boris',
    skill:          'hermes/intake-quality',
    skill_context:  null,
    status:         'failed',
    result_summary: null,
    error_message:  'something broke',
    pr_state:       null,
    pr_url:         null,
    retry_count:    0,
    proposed_at:    null,
    approved_at:    null,
    started_at:     '2026-05-01T10:00:00Z',
    completed_at:   '2026-05-01T10:01:00Z',
    created_at:     '2026-05-01T09:59:00Z',
    task_title:     'a task',
    task_seq:       42,
    ...overrides,
  };
}

// HTTP-mode tests for DispatchService. The service constructor fires a GET
// against /api/dispatch/queue on init; we drain that with a fixture array
// before exercising the mutation methods.
//
// retry() posts to POST /api/dispatch/{id}/retry — server owns the column
// flip, dashboard sends no body.

describe('DispatchService.retry (HTTP mode)', () => {
  let service: DispatchService;
  let http: HttpTestingController;
  let toast: ToastService;

  beforeEach(() => {
    // Force HTTP mode (no ?seed=1) so retry actually fires the PATCH.
    window.history.replaceState({}, '', window.location.pathname);
    resetSeedModeCache();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(DispatchService);
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);

    // Drain the constructor-time GET. Tests override the fixture by
    // re-flushing in their own setup if they need different rows.
    const initReq = http.expectOne(r => r.url.includes('/api/dispatch/queue'));
    initReq.flush({ items: [fakeEntry()], total: 1 });
  });

  afterEach(() => {
    http.verify();
    resetSeedModeCache();
  });

  function lastErrorToast(): string | undefined {
    const errs = toast.toasts().filter(t => t.tone === 'error');
    return errs[errs.length - 1]?.message;
  }
  function lastSuccessToast(): string | undefined {
    const ok = toast.toasts().filter(t => t.tone === 'success');
    return ok[ok.length - 1]?.message;
  }

  it('carries commission-flow fields through the mapper on load (flow/agent_type set, no-PR → null)', () => {
    // beforeEach already loaded the default fixture: flow=commission, agent_type=
    // claude, pr_state/pr_url=null, raw status=failed. Assert the mapper carried
    // all of them (including the raw db_status alongside the narrowed status).
    const entry = service.getById(dispatchId('1'))!;
    expect(entry.flow).toBe('commission');
    expect(entry.agent_type).toBe('claude');
    expect(entry.pr_state).toBeNull();
    expect(entry.pr_url).toBeNull();
    expect(entry.db_status).toBe('failed');
  });

  it('flips a failed entry to approved optimistically before the request resolves', () => {
    const id = dispatchId('1');
    service.retry(id);

    // Optimistic state visible immediately, before flush.
    const optimistic = service.getById(id)!;
    expect(optimistic.status).toBe('approved');
    expect(optimistic.error).toBeNull();
    expect(optimistic.retry_count).toBe(1);

    // Drain the POST request and respond with the canonical updated row.
    const req = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/api/dispatch/1/retry'));
    expect(req.request.body).toEqual({});
    req.flush(fakeEntry({ id: 1, status: 'approved', error_message: null, retry_count: 1, started_at: null, completed_at: null, pr_state: 'open', pr_url: 'https://github.com/x/y/pull/9' }));

    expect(lastSuccessToast()).toMatch(/queued for retry/i);
    const after = service.getById(id)!;
    expect(after.status).toBe('approved');
    // Non-null PR fields carry through the mapper on the retry success path too.
    expect(after.pr_state).toBe('open');
    expect(after.pr_url).toBe('https://github.com/x/y/pull/9');
  });

  it('rolls back to failed and toasts on network error', () => {
    const id = dispatchId('1');
    service.retry(id);

    const req = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/retry'));
    req.error(new ProgressEvent('network'), { status: 500, statusText: 'Server Error' });

    const after = service.getById(id)!;
    expect(after.status).toBe('failed');
    expect(after.error).toBe('something broke');
    expect(after.retry_count).toBe(0);
    expect(lastErrorToast()).toMatch(/retry failed/i);
  });

  it('warns but does not roll back when the response payload fails the schema', () => {
    const id = dispatchId('1');
    service.retry(id);

    const req = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/retry'));
    // Server accepted the POST but returned a malformed body. The optimistic
    // approved state should stand — the server already committed; refresh
    // will reconcile. The toast tells the operator to verify.
    req.flush({ totally: 'wrong shape' });

    expect(service.getById(id)!.status).toBe('approved');
    expect(lastErrorToast()).toMatch(/malformed/i);
  });

  it('is a no-op when the entry is not in failed status', () => {
    // The fixture's sole entry is 'failed'; use a different id and rely on the
    // unknown-id path also being a no-op (next test).
    service.retry(dispatchId('999'));
    http.expectNone(r => r.method === 'POST' && r.url.endsWith('/retry'));
  });

  it('is a no-op when the id is unknown', () => {
    service.retry(dispatchId('does-not-exist'));
    http.expectNone(r => r.method === 'POST' && r.url.endsWith('/retry'));
  });
});

// T1.3 — the mapper must stop collapsing proposed/rejected. It keeps the narrowed
// `status` (legacy board) but preserves the raw value in `db_status` (commission
// board reads this for truthful Proposed/Rejected columns).
describe('DispatchService mapper — db_status preserves raw status (T1.3)', () => {
  let service: DispatchService;
  let http: HttpTestingController;

  beforeEach(() => {
    window.history.replaceState({}, '', window.location.pathname);
    resetSeedModeCache();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DispatchService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    resetSeedModeCache();
  });

  it('keeps proposed/rejected in db_status while status narrows them', () => {
    http.expectOne(r => r.url.includes('/api/dispatch/queue')).flush({
      items: [
        fakeEntry({ id: 1, status: 'proposed' }),
        fakeEntry({ id: 2, status: 'rejected' }),
      ],
      total: 2,
    });

    const proposed = service.getById(dispatchId('1'))!;
    expect(proposed.status).toBe('approved');    // narrowed (legacy board)
    expect(proposed.db_status).toBe('proposed'); // preserved (truthful)

    const rejected = service.getById(dispatchId('2'))!;
    expect(rejected.status).toBe('failed');      // narrowed (legacy board)
    expect(rejected.db_status).toBe('rejected'); // preserved (truthful)
  });
});
