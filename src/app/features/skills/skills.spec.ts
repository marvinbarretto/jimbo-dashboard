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
