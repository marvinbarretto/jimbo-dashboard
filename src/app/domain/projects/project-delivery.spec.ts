import {
  deriveDeliveryRows,
  hasCodebase,
  sortPrsForAttention,
  type DeliveryBoundary,
  type DeliveryBoundaryRow,
  type DeliveryPr,
  type ProjectDelivery,
  type ProjectStateDeliverySlice,
} from './project-delivery';
import type { Project, ProjectAutonomyLevel } from './project';

// Builders, not mocks — the whole module is pure, so there is nothing to stub.

function aDelivery(over: Partial<ProjectDelivery> = {}): ProjectDelivery {
  return {
    repo: 'marvinbarretto/jimbo',
    latest_tag: 'v1.4.0',
    unshipped: 3,
    open_prs: [],
    failing: 0,
    auto_merge: 0,
    error: null,
    ...over,
  };
}

function aPr(over: Partial<DeliveryPr> = {}): DeliveryPr {
  return {
    number: 1,
    title: 'A change',
    url: 'https://github.com/marvinbarretto/jimbo/pull/1',
    ci: 'passing',
    auto_merge: false,
    age_days: 2,
    note_seq: null,
    draft: false,
    ...over,
  };
}

function aSlice(over: Partial<ProjectStateDeliverySlice> = {}): ProjectStateDeliverySlice {
  return {
    delivery: aDelivery(),
    wip: { proposed_dispatches: 0, in_flight_dispatches: 0 },
    ...over,
  };
}

type BriefBits = Pick<Project, 'autonomy_level' | 'deploy_target'>;

function aProject(
  autonomy: ProjectAutonomyLevel | null = null,
  deployTarget: string | null = 'Fly.io, promoted by hand',
): BriefBits {
  return { autonomy_level: autonomy, deploy_target: deployTarget } as BriefBits;
}

const row = (rows: DeliveryBoundaryRow[], b: DeliveryBoundary): DeliveryBoundaryRow =>
  rows.find(r => r.boundary === b)!;

describe('deriveDeliveryRows', () => {
  it('covers all four boundaries in commission → merge → review → promote order', () => {
    const rows = deriveDeliveryRows(aProject(), aSlice());
    expect(rows.map(r => r.boundary)).toEqual(['Commission', 'Merge', 'Review', 'Promote']);
  });

  // The rule that matters more than the layout: an unmodelled cell must state
  // that no policy exists, never render blank or a dash that reads as
  // "nothing needed here".
  describe('undeclared boundaries', () => {
    it('says "not declared" for merge and review, which have no project-level policy', () => {
      const rows = deriveDeliveryRows(aProject(), aSlice());
      for (const b of ['Merge', 'Review'] as const) {
        expect(row(rows, b).declared.state).toBe('not-declared');
        expect(row(rows, b).declared.text).toBe('not declared');
        expect(row(rows, b).declared.hint).toBeTruthy();
      }
    });

    it('says "not declared" for promote when the brief has no deploy target', () => {
      const rows = deriveDeliveryRows(aProject(null, null), aSlice());
      expect(row(rows, 'Promote').declared.state).toBe('not-declared');
    });

    it('treats whitespace-only prose as no deploy target', () => {
      const rows = deriveDeliveryRows(aProject(null, '   '), aSlice());
      expect(row(rows, 'Promote').declared.state).toBe('not-declared');
    });

    it('shows the deploy prose verbatim when it is there', () => {
      const rows = deriveDeliveryRows(aProject(null, 'VPS via deploy.sh'), aSlice());
      expect(row(rows, 'Promote').declared).toMatchObject({ state: 'stated', text: 'VPS via deploy.sh' });
    });
  });

  describe('commission', () => {
    // A null autonomy_level IS a position — inherit the default — so it is
    // stated, not undeclared. Only a boundary with no field at all is the latter.
    it('reads an unset autonomy level as an inherited default, not as undeclared', () => {
      const declared = row(deriveDeliveryRows(aProject(null), aSlice()), 'Commission').declared;
      expect(declared.state).toBe('stated');
      expect(declared.text).toContain('Default');
    });

    // The field is advisory: the only check anywhere is `!== 'ship'` on the
    // manual enqueue path. Saying "read-only" without that caveat overstates it.
    it('carries autonomy’s true scope in the hint, including that none is unenforced', () => {
      const declared = row(deriveDeliveryRows(aProject('none'), aSlice()), 'Commission').declared;
      expect(declared.hint).toContain('Not enforced today');
      expect(declared.hint).toContain('manually enqueued');
    });

    it('reports dispatch counts, and says so plainly when there are none', () => {
      expect(row(deriveDeliveryRows(aProject(), aSlice()), 'Commission').live.text).toBe('Nothing queued');
      const busy = aSlice({ wip: { proposed_dispatches: 2, in_flight_dispatches: 1 } });
      expect(row(deriveDeliveryRows(aProject(), busy), 'Commission').live.text).toBe('2 proposed · 1 in flight');
    });
  });

  describe('review', () => {
    it('admits nothing measures awaiting-review rather than deriving a number', () => {
      const live = row(deriveDeliveryRows(aProject(), aSlice()), 'Review').live;
      expect(live.state).toBe('unmeasured');
      expect(live.text).toBe('Not measured');
      expect(live.hint).toBeTruthy();
    });
  });

  describe('a repo the sweep could not reach', () => {
    // delivery.ts fills a failed repo with zeros so the block keeps its shape.
    // Rendering those as counts would report a dark instrument as all-clear.
    const errored = aSlice({
      delivery: aDelivery({ error: 'GET /repos/x → 401', latest_tag: null, unshipped: 0, open_prs: [], failing: 0 }),
    });

    it('renders merge and promote as unavailable, never as zero', () => {
      const rows = deriveDeliveryRows(aProject(), errored);
      for (const b of ['Merge', 'Promote'] as const) {
        expect(row(rows, b).live.state).toBe('unmeasured');
        expect(row(rows, b).live.text).toBe('Unavailable');
        expect(row(rows, b).live.hint).toContain('401');
      }
    });

    it('does not raise the alert on a row it could not measure', () => {
      expect(row(deriveDeliveryRows(aProject(), errored), 'Merge').alert).toBe(false);
    });
  });

  describe('a project with no delivery block at all', () => {
    it('says the boundary is unmeasured rather than clean', () => {
      const rows = deriveDeliveryRows(aProject(), aSlice({ delivery: null }));
      expect(row(rows, 'Merge').live.state).toBe('unmeasured');
      expect(row(rows, 'Promote').live.state).toBe('unmeasured');
    });
  });

  describe('promote', () => {
    // With no tag the API's `unshipped` is 0 because nothing has ever been
    // released — the opposite of "everything is shipped".
    it('says "never tagged" instead of reporting zero unshipped commits', () => {
      const rows = deriveDeliveryRows(aProject(), aSlice({ delivery: aDelivery({ latest_tag: null, unshipped: 0 }) }));
      const live = row(rows, 'Promote').live;
      expect(live.state).toBe('unmeasured');
      expect(live.text).toBe('Never tagged');
      expect(live.text).not.toContain('0');
    });

    it('names the tag and the unshipped delta when both are real', () => {
      const live = row(deriveDeliveryRows(aProject(), aSlice()), 'Promote').live;
      expect(live).toMatchObject({ state: 'stated', text: 'v1.4.0 · 3 unshipped' });
    });

    it('distinguishes a tagged repo with nothing outstanding', () => {
      const rows = deriveDeliveryRows(aProject(), aSlice({ delivery: aDelivery({ unshipped: 0 }) }));
      expect(row(rows, 'Promote').live.text).toBe('v1.4.0 · nothing unshipped');
    });
  });

  describe('merge', () => {
    it('flags a failing PR as the one row that wants attention', () => {
      const d = aDelivery({ open_prs: [aPr({ ci: 'failing', auto_merge: true })], failing: 1, auto_merge: 1 });
      const merge = row(deriveDeliveryRows(aProject(), aSlice({ delivery: d })), 'Merge');
      expect(merge.alert).toBe(true);
      expect(merge.live.text).toBe('1 open · 1 failing · 1 auto-merge');
      expect(merge.live.hint).toContain('silently never lands');
    });

    it('does not flag a green queue', () => {
      const d = aDelivery({ open_prs: [aPr()], failing: 0 });
      const merge = row(deriveDeliveryRows(aProject(), aSlice({ delivery: d })), 'Merge');
      expect(merge.alert).toBe(false);
      expect(merge.live.text).toBe('1 open');
    });

    // A measured zero is a real answer and reads as one.
    it('states an empty PR queue as a fact, not as an absence', () => {
      const merge = row(deriveDeliveryRows(aProject(), aSlice()), 'Merge');
      expect(merge.live).toMatchObject({ state: 'stated', text: 'No open PRs' });
    });
  });
});

describe('sortPrsForAttention', () => {
  it('leads with failing PRs and sinks drafts', () => {
    const prs = [
      aPr({ number: 1, ci: 'passing' }),
      aPr({ number: 2, ci: 'failing', draft: true }),
      aPr({ number: 3, ci: 'failing' }),
      aPr({ number: 4, ci: 'none' }),
    ];
    expect(sortPrsForAttention(prs).map(p => p.number)).toEqual([3, 4, 1, 2]);
  });

  it('breaks ties by age, oldest first', () => {
    const prs = [aPr({ number: 1, age_days: 1 }), aPr({ number: 2, age_days: 9 })];
    expect(sortPrsForAttention(prs).map(p => p.number)).toEqual([2, 1]);
  });

  it('does not mutate the input', () => {
    const prs = [aPr({ number: 1, ci: 'passing' }), aPr({ number: 2, ci: 'failing' })];
    sortPrsForAttention(prs);
    expect(prs.map(p => p.number)).toEqual([1, 2]);
  });
});

describe('hasCodebase', () => {
  it('is true for a repo_url or any member repo', () => {
    expect(hasCodebase({ repo_url: 'https://github.com/x/y', repos: null } as Project)).toBe(true);
    expect(hasCodebase({ repo_url: null, repos: [{ repo: 'dashboard' }] } as unknown as Project)).toBe(true);
  });

  // A travel or life-admin project crosses none of these boundaries; the
  // section renders nothing rather than four "not declared" rows.
  it('is false for a project with no codebase', () => {
    expect(hasCodebase({ repo_url: null, repos: [] } as unknown as Project)).toBe(false);
    expect(hasCodebase({ repo_url: '', repos: null } as unknown as Project)).toBe(false);
  });
});
