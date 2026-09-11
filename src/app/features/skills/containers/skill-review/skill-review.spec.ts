// These tests pin the ways this page could lie, which are all the same shape:
// rendering an absence as a number. A skill that did not run must not read as
// free, and a job whose answers cannot be seen must not read as ignored.
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SkillReview } from './skill-review';
import { SkillsService, type SkillEconomics } from '../../data-access/skills.service';

function economics(over: Partial<SkillEconomics> & { skill_id: string }): SkillEconomics {
  return {
    dispatches: 1, completed: 1, failed: 0, declined: 0,
    cost_usd: null, turns: 0, avg_input_tokens: null, avg_output_tokens: null,
    models: [], last_run_at: null, ...over,
  };
}

const SKILL = {
  id: 'briefing/daily-v2', name: 'daily-v2', description: 'the briefing',
  type: 'agent', metadata: {}, body: '',
};

describe('SkillReview', () => {
  let page: SkillReview;
  let http: HttpTestingController;
  let skills: SkillsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    skills = TestBed.inject(SkillsService);
    http = TestBed.inject(HttpTestingController);
    page = TestBed.runInInjectionContext(() => new SkillReview());
  });

  /** Answer the fetches the service constructor and the page both fire. */
  function settle(opts: { economics?: SkillEconomics[]; skills?: unknown[] } = {}): void {
    http.match(r => r.url.endsWith('/api/skills') && r.method === 'GET')
      .forEach(r => r.flush(opts.skills ?? [SKILL]));
    http.match(r => r.url.endsWith('/skills/usage')).forEach(r => r.flush({ items: [] }));
    http.match(r => r.url.endsWith('/skills/economics'))
      .forEach(r => r.flush({ items: opts.economics ?? [] }));
    http.match(r => r.url.includes('/agent-runs/effectiveness')).forEach(r => r.flush({ items: [] }));
    http.match(r => r.url.includes('/agent-runs/ratings')).forEach(r => r.flush({ items: [] }));
  }

  describe('ranking', () => {
    it('separates a skill that did not run from one that cost nothing', () => {
      // The distinction the whole page rests on. Both would render as "0" in a
      // naive table, and they are opposite facts: one has no evidence, the
      // other has evidence of being cheap.
      settle({
        skills: [SKILL, { ...SKILL, id: 'think/reflect', name: 'reflect' }],
        economics: [economics({ skill_id: 'briefing/daily-v2', cost_usd: null, dispatches: 3 })],
      });

      expect(page.ranked().map(r => r.id)).toEqual(['briefing/daily-v2']);
      expect(page.ranked()[0].cost).toBeNull();
      expect(page.neverRan().map(r => r.id)).toEqual(['think/reflect']);
    });

    it('orders by spend and computes share against the priced total', () => {
      settle({
        skills: [SKILL, { ...SKILL, id: 'code/doc-refresh', name: 'doc-refresh' }],
        economics: [
          economics({ skill_id: 'code/doc-refresh', cost_usd: 25, completed: 50, dispatches: 50 }),
          economics({ skill_id: 'briefing/daily-v2', cost_usd: 75, completed: 30, dispatches: 30 }),
        ],
      });

      const rows = page.ranked();
      expect(rows.map(r => r.id)).toEqual(['briefing/daily-v2', 'code/doc-refresh']);
      expect(rows[0].sharePct).toBe(75);
      expect(rows[0].costPerRun).toBeCloseTo(2.5, 2);
    });

    it('leaves cost-per-run null when nothing completed, rather than dividing by zero', () => {
      settle({
        economics: [economics({ skill_id: 'briefing/daily-v2', cost_usd: 5, completed: 0, dispatches: 4 })],
      });
      expect(page.ranked()[0].costPerRun).toBeNull();
    });

    it('includes a flow that spends but has no registry entry', () => {
      // The three grooming stages run from hub/hermes/skills and are absent
      // from /api/skills. Ranking only the registry would print a total the
      // visible rows do not add up to — the one thing a spend table must not do.
      settle({
        economics: [
          economics({ skill_id: 'briefing/daily-v2', cost_usd: 60, completed: 10, dispatches: 10 }),
          economics({ skill_id: 'dispatch/vault-classify', cost_usd: 40, completed: 600, dispatches: 600 }),
        ],
      });

      const rows = page.ranked();
      expect(rows.map(r => r.id)).toEqual(['briefing/daily-v2', 'dispatch/vault-classify']);
      const groom = rows[1];
      expect(groom.unregistered).toBe(true);
      expect(groom.status).toBeUndefined();
      // Shares must account for the whole total, or the table lies by omission.
      expect(rows.reduce((sum, r) => sum + (r.sharePct ?? 0), 0)).toBeCloseTo(100, 1);
    });

    it('flags a skill that ran on more than one model family', () => {
      // Invisible from frontmatter, and it ran for 16 days before a column
      // existed to show it. Two entries is the whole signal.
      settle({
        economics: [economics({
          skill_id: 'briefing/daily-v2', cost_usd: 10, completed: 5, dispatches: 5,
          models: ['claude-opus-5×38', 'deepseek/deepseek-v4-flash×12'],
        })],
      });
      const row = page.ranked()[0];
      expect(row.mixedModels).toBe(true);
      expect(row.models).toEqual(['opus×38', 'deepseek-v4-flash×12']);
    });
  });

  it('says the registry failed rather than rendering an empty board', () => {
    // A failed load and an idle window are indistinguishable once rendered as
    // an empty table, and only one of them is a fact about the fleet. Seen
    // happening: /api/skills 500'd while the cost fetch succeeded, and the page
    // read "£417 across 0 skills".
    http.match(r => r.url.endsWith('/api/skills') && r.method === 'GET')
      .forEach(r => r.flush('boom', { status: 500, statusText: 'Server Error' }));
    http.match(r => r.url.endsWith('/skills/usage')).forEach(r => r.flush({ items: [] }));
    http.match(r => r.url.endsWith('/skills/economics'))
      .forEach(r => r.flush({ items: [economics({ skill_id: 'briefing/daily-v2', cost_usd: 99 })] }));
    http.match(r => r.url.includes('/agent-runs/')).forEach(r => r.flush({ items: [] }));

    expect(page.registryError()).toBeTruthy();
    expect(page.ranked().length).toBe(0);
  });

  describe('askLabel', () => {
    it('shows a dash for a job that never asked', () => {
      settle();
      expect(page.askLabel({ asked: 0, answered: 0, answers_attributable: true })).toBe('—');
    });

    it('says unobservable rather than 0 when the channel cannot be heard', () => {
      // ADR-0037. "He ignored it" and "we were not listening" are different
      // facts and only one of them is grounds to cut a job.
      settle();
      expect(page.askLabel({ asked: 33, answered: 0, answers_attributable: false }))
        .toBe('33 asked · unobservable');
    });

    it('shows the rate when answers are observable — including a real zero', () => {
      settle();
      expect(page.askLabel({ asked: 138, answered: 0, answers_attributable: true })).toBe('0/138');
      expect(page.askLabel({ asked: 8, answered: 5, answers_attributable: true })).toBe('5/8');
    });
  });

  it('reverts a job rating that failed to save', () => {
    // Same reasoning as the skill verdict: the page is the record, so a verdict
    // that silently failed to save is worse than one that never moved.
    settle();
    page.setRating('coach-nudge', 'cut');
    expect(page.jobs).toBeDefined();
    http.expectOne(r => r.method === 'PUT' && r.url.includes('coach-nudge'))
      .error(new ProgressEvent('network'));
    // Nothing to assert on the row (no fires in this fixture); the contract is
    // that the optimistic entry is removed rather than left showing "cut".
    expect(page.jobs().find(j => j.job_name === 'coach-nudge')).toBeUndefined();
  });
});
