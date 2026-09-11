import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SkillsService, type SkillEconomics } from './data-access/skills.service';

function economics(over: Partial<SkillEconomics> & { skill_id: string }): SkillEconomics {
  return {
    dispatches: 1, completed: 1, failed: 0, declined: 0,
    cost_usd: null, turns: 0, avg_input_tokens: null, avg_output_tokens: null,
    models: [], last_run_at: null, ...over,
  };
}

describe('SkillsService', () => {
  let service: SkillsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(SkillsService);
    http = TestBed.inject(HttpTestingController);
  });

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  it('skills() starts empty before HTTP completes', () => {
    expect(service.skills()).toEqual([]);
  });

  it('activeSkills() treats missing is_active as active', () => {
    // metadata.is_active === false → inactive; otherwise active.
    const active = service.activeSkills();
    expect(active.every(s => s.metadata.is_active !== false)).toBe(true);
  });

  describe('setStatus', () => {
    /** Seed the registry the way load() would, so a row exists to edit. */
    function seed(id: string, status?: string): void {
      http.expectOne(r => r.url.endsWith('/api/skills') && r.method === 'GET')
        .flush([{ id, name: id, description: '', type: 'agent', metadata: { status }, body: '' }]);
      http.expectOne(r => r.url.endsWith('/skills/usage')).flush({ items: [] });
      http.expectOne(r => r.url.endsWith('/skills/economics')).flush({ items: [] });
    }

    it('moves the row immediately and clears pending once the push lands', () => {
      seed('write/reflect', 'keep');
      service.setStatus('write/reflect', 'shelve');

      // Optimistic: the verdict is visible before hub has been pushed to.
      expect(service.skills()[0].metadata.status).toBe('shelve');
      expect(service.pendingStatus().has('write/reflect')).toBe(true);

      const req = http.expectOne(r => r.method === 'PATCH');
      expect(req.request.body).toEqual({ metadata: { status: 'shelve' } });
      req.flush({ id: 'write/reflect', name: 'write/reflect', description: '', type: 'agent',
                  metadata: { status: 'shelve' }, body: '' });

      expect(service.pendingStatus().has('write/reflect')).toBe(false);
      expect(service.statusError().has('write/reflect')).toBe(false);
    });

    it('reverts and surfaces the error when the push fails', () => {
      // The page is the record of what was decided. A verdict that silently
      // failed to save is worse than one that never moved, because the reader
      // would carry on believing it stuck.
      seed('write/reflect', 'keep');
      service.setStatus('write/reflect', 'shelve');
      http.expectOne(r => r.method === 'PATCH')
        .flush({ error: 'push rejected: non-fast-forward' }, { status: 409, statusText: 'Conflict' });

      expect(service.skills()[0].metadata.status).toBe('keep');
      expect(service.statusError().get('write/reflect')).toContain('non-fast-forward');
      expect(service.pendingStatus().has('write/reflect')).toBe(false);
    });

    it('sends only the status, so the rest of the metadata survives the merge', () => {
      // PATCH merges server-side (jimbo-api services/skills.ts:431). Sending a
      // whole metadata object from here would race another editor and clobber
      // whatever they had just written to a different field.
      seed('write/reflect', 'keep');
      service.setStatus('write/reflect', 'refine');
      expect(http.expectOne(r => r.method === 'PATCH').request.body)
        .toEqual({ metadata: { status: 'refine' } });
    });

    it('does nothing when the verdict is unchanged', () => {
      seed('write/reflect', 'keep');
      service.setStatus('write/reflect', 'keep');
      http.expectNone(r => r.method === 'PATCH');
    });
  });

  describe('economics', () => {
    /** Answer the economics request the constructor already fired. */
    function flush(items: SkillEconomics[], days = 30): void {
      http.expectOne(r => r.url.endsWith('/skills/economics') && r.params.get('days') === String(days))
        .flush({ items });
    }

    it('totalCost() is null when nothing in the window carried a price', () => {
      // Not 0. A window where nothing was billed and a window that genuinely
      // cost nothing look identical as a number and mean opposite things — the
      // header would read "£0.00 total" over a fleet nobody has priced.
      flush([economics({ skill_id: 'code/gh-issue' })]);
      expect(service.totalCost()).toBeNull();
    });

    it('totalCost() sums only the priced rows', () => {
      flush([
        economics({ skill_id: 'briefing/daily-v2', cost_usd: 106.63, completed: 53 }),
        economics({ skill_id: 'code/gh-issue' }),
      ]);
      expect(service.totalCost()).toBeCloseTo(106.63, 2);
    });

    it('refetches on a window change and drops the previous window', () => {
      flush([economics({ skill_id: 'a', cost_usd: 1 })]);
      service.loadEconomics(7);
      expect(service.economicsDays()).toBe(7);
      flush([economics({ skill_id: 'b', cost_usd: 2 })], 7);
      // The 30d row must be gone, not merged: a stale cost under a window the
      // reader believes they changed is worse than a blank cell.
      expect(service.economics().has('a')).toBe(false);
      expect(service.economics().get('b')?.cost_usd).toBe(2);
    });

    it('empties rather than keeping stale costs when the fetch fails', () => {
      flush([economics({ skill_id: 'a', cost_usd: 1 })]);
      service.loadEconomics(90);
      http.expectOne(r => r.url.endsWith('/skills/economics') && r.params.get('days') === '90')
        .error(new ProgressEvent('network'));
      expect(service.economics().size).toBe(0);
      expect(service.totalCost()).toBeNull();
    });
  });
});
