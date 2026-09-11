import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { MoneyPage } from './money-page';
import type { MoneyActual, MoneyAggregates, MoneySummary } from '../../data-access/money';

// A budget where nothing has gone wrong, so each test can break one thing.
const clean = (over: Partial<MoneySummary['assumptions']> = {}): MoneySummary => ({
  budget: { id: 'b1', name: "Marvin's Plan", currency: 'GBP', first_month: '2026-09-01', last_month: '2026-09-01' },
  pulled_at: '2026-09-11T17:00:00.000Z',
  cached: false,
  position: { total_cash: 150294.59, company_fenced: 96159.01, personal: 54135.58 },
  plan: { monthly_spend: 2167, runway_months: 25 },
  month: { month: '2026-09-01', to_be_budgeted: 37320, age_of_money: 0, income: 0, budgeted: 0, activity: 0 },
  attention: { uncategorised: 0, unapproved: 0, since: '2026-06-13' },
  // Null by default: most of these tests are about the PLANNED half, and the
  // measured half must never be required for those to make sense.
  actual: null,
  assumptions: {
    company_group_matched: 'Fourfold (company)',
    spend_groups_counted: ['Bills', 'Needs', 'Subscriptions', 'Wants'],
    spend_groups_missing: [],
    lumpy_excluded: [{ name: 'Clothes', budgeted: 25, detected_by: 'goal' }],
    tracking_accounts_excluded: [],
    ...over,
  },
});

const measured = (over: Partial<MoneyActual> = {}): MoneyActual => ({
  monthly_spend: 4639.78,
  monthly_burn: 3144.19,
  runway_months: 34.5,
  personal_only_runway_months: 3.9,
  basis_months: ['2026-06', '2026-07', '2026-08'],
  excluded_currencies: {},
  incomplete: false,
  generated: '2026-09-11',
  first_received_at: '2026-09-11T19:01:49.233Z',
  last_received_at: '2026-09-11T19:01:53.876Z',
  ...over,
});

const published = (over: Partial<MoneyAggregates['payload']> = {}): MoneyAggregates => ({
  generated: '2026-09-11',
  first_received_at: '2026-09-11T19:01:49.233Z',
  last_received_at: '2026-09-11T19:01:53.876Z',
  payload: {
    generated: '2026-09-11',
    months: ['2026-06', '2026-07', '2026-08'],
    full_months: ['2026-06', '2026-07', '2026-08'],
    categories: {
      'Pub & eating out': { '2026-06': 300, '2026-07': 280, '2026-08': 272 },
      Housing: { '2026-06': 1384, '2026-07': 1384, '2026-08': 1384 },
    },
    totals: { '2026-06': 4200, '2026-07': 4100, '2026-08': 4000 },
    watchlist: { 'Anthropic / Claude': { '2026-06': 180, '2026-07': 200, '2026-08': 220 } },
    household: {
      '2026-06': { income: 1176, spend: 5764, net: -4588 },
      '2026-07': { income: 1500, spend: 4200, net: -2700 },
      '2026-08': { income: 1800, spend: 3900, net: -2100 },
    },
    baseline: { income: 1495.58, spend: 4639.78, burn: 3144.19, months: ['2026-06', '2026-07', '2026-08'] },
    runway: {
      burn_per_month: 3144.19, months_gbp: 34.5, personal_only_months_gbp: 3.9,
      excluded_currencies: {}, incomplete: false,
    },
    break_even_days_per_month: { '350': 9.0, '400': 7.9 },
    coverage: { cross_account_from: '2026-06', monzo_only_before: false, basis_note: 'x' },
    ...over,
  },
});

function pageWith(summary: MoneySummary, aggregates: MoneyAggregates | null = null): MoneyPage {
  const page = TestBed.inject(MoneyPage);
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(req => req.url.endsWith('/api/money/summary')).flush(summary);
  http.expectOne(req => req.url.endsWith('/api/money/categories')).flush({
    pulled_at: summary.pulled_at, cached: false, categories: [],
  });
  const agg = http.expectOne(req => req.url.endsWith('/api/money/aggregates'));
  if (aggregates) agg.flush(aggregates);
  // 404 is the real "never published" response, so the empty path is tested
  // through the same status the API actually returns.
  else agg.flush({ error: {} }, { status: 404, statusText: 'Not Found' });
  return page;
}

describe('MoneyPage drift warnings', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        MoneyPage,
      ],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('stays quiet when every assumption still holds', () => {
    expect(pageWith(clean()).driftWarnings()).toEqual([]);
  });

  it('shouts when the company fence matches nothing', () => {
    // The worst failure available: personal position silently swallows £96k of
    // company money and still looks like a perfectly reasonable number.
    const warnings = pageWith(clean({ company_group_matched: null })).driftWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('NOT fenced');
  });

  it('names a spend group that has gone missing', () => {
    // A renamed group drops out of the divisor, and runway gets LONGER —
    // the direction that never prompts anyone to check.
    const warnings = pageWith(clean({ spend_groups_missing: ['Wants'] })).driftWarnings();
    expect(warnings[0]).toContain('"Wants"');
    expect(warnings[0]).toContain('longer');
  });

  it('flags a lumpy category still matched by name rather than a goal', () => {
    const page = pageWith(clean({
      lumpy_excluded: [
        { name: 'Clothes', budgeted: 25, detected_by: 'goal' },
        { name: 'Health', budgeted: 30, detected_by: 'name' },
      ],
    }));
    expect(page.lumpyByName().map(l => l.name)).toEqual(['Health']);
    expect(page.driftWarnings()[0]).toContain('Health');
  });

  it('reports every broken assumption at once, not just the first', () => {
    const warnings = pageWith(clean({
      company_group_matched: null,
      spend_groups_missing: ['Bills', 'Wants'],
    })).driftWarnings();
    expect(warnings).toHaveLength(3);
  });
});

describe('MoneyPage attention', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        MoneyPage,
      ],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('is calm at zero and zero', () => {
    expect(pageWith(clean()).needsAttention()).toBe(false);
  });

  it('wakes up for a single uncategorised transaction', () => {
    const s = clean();
    s.attention.uncategorised = 1;
    expect(pageWith(s).needsAttention()).toBe(true);
  });
});

describe('MoneyPage plan against measurement', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        MoneyPage,
      ],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('shows nothing to compare before the pipeline has published', () => {
    // The failure this guards against is falling back to `plan` and presenting
    // intent as measurement — so the absence must stay visibly absent.
    const page = pageWith(clean());
    expect(page.actual()).toBeNull();
    expect(page.planVsActual()).toBeNull();
    expect(page.aggregatesMissing()).toBe(true);
  });

  it('reports the gap as a monthly overspend, not as two runway figures', () => {
    const s = clean();
    s.actual = measured();
    const gap = pageWith(s, published()).planVsActual()!;
    expect(gap.planned).toBe(2167);
    expect(gap.measured).toBe(3144.19);
    expect(gap.gap).toBeCloseTo(977.19, 2);
    expect(gap.overspending).toBe(true);
  });

  it('knows which direction is the dangerous one', () => {
    // Spending less than planned is merely pessimistic budgeting. Spending more
    // inflates the runway, and that is the direction nobody goes looking for.
    const s = clean();
    s.actual = measured({ monthly_burn: 1500 });
    expect(pageWith(s, published()).planVsActual()!.overspending).toBe(false);
  });

  it('marks every measured figure as a floor when a balance is unknown', () => {
    const s = clean();
    s.actual = measured({ incomplete: true });
    expect(pageWith(s, published()).measuredCaveats()[0]).toContain('FLOOR');
  });

  it('names money held but excluded from the runway', () => {
    // Dropping this overstates how complete the runway figure is.
    const s = clean();
    s.actual = measured({ excluded_currencies: { USD: 37300 } });
    const caveats = pageWith(s, published()).measuredCaveats();
    expect(caveats.some(c => c.includes('USD') && c.includes('NOT counted'))).toBe(true);
  });

  it('carries the single-account coverage caveat off the published report', () => {
    const s = clean();
    s.actual = measured();
    const agg = published({
      coverage: { cross_account_from: '2026-06', monzo_only_before: true, basis_note: 'Monzo only before then.' },
    });
    expect(pageWith(s, agg).measuredCaveats().some(c => c.includes('one account only'))).toBe(true);
  });
});

describe('MoneyPage measured series', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        MoneyPage,
      ],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('ranks categories by what they actually cost per month', () => {
    const rows = pageWith(clean(), published()).categorySpend();
    expect(rows.map(r => r.label)).toEqual(['Housing', 'Pub & eating out']);
    expect(rows[1].perMonth).toBeCloseTo(284, 0);
    expect(rows[1].latest).toBe(272);
  });

  it('averages over the months a category exists in, not over the window', () => {
    // A category present for one of three months must read at its real monthly
    // cost, not at a third of it — otherwise a new subscription looks cheap.
    const rows = pageWith(clean(), published({
      categories: { Gym: { '2026-08': 90 } },
    })).categorySpend();
    expect(rows[0].perMonth).toBe(90);
  });

  it('drops a category that cost nothing over the window', () => {
    const rows = pageWith(clean(), published({
      categories: { Housing: { '2026-06': 1384 }, Dormant: { '2026-06': 0 } },
    })).categorySpend();
    expect(rows.map(r => r.label)).toEqual(['Housing']);
  });

  it('excludes a partial current month from the window', () => {
    // full_months is what the pipeline vouches for as complete; averaging a
    // half-finished month in drags every figure down for no reason but the date.
    const page = pageWith(clean(), published({
      months: ['2026-06', '2026-07', '2026-08', '2026-09'],
      full_months: ['2026-06', '2026-07', '2026-08'],
    }));
    expect(page.recentWindow()).toEqual(['2026-06', '2026-07', '2026-08']);
  });

  it('orders break-even by day rate so the table reads low to high', () => {
    expect(pageWith(clean(), published()).breakEven()).toEqual([
      { rate: 350, days: 9.0 },
      { rate: 400, days: 7.9 },
    ]);
  });

  it('has no series to show when nothing is published', () => {
    const page = pageWith(clean());
    expect(page.categorySpend()).toEqual([]);
    expect(page.watchlistSpend()).toEqual([]);
    expect(page.breakEven()).toEqual([]);
  });
});
