import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { MoneyPage } from './money-page';
import type { MoneySummary } from '../../data-access/money';

// A budget where nothing has gone wrong, so each test can break one thing.
const clean = (over: Partial<MoneySummary['assumptions']> = {}): MoneySummary => ({
  budget: { id: 'b1', name: "Marvin's Plan", currency: 'GBP', first_month: '2026-09-01', last_month: '2026-09-01' },
  pulled_at: '2026-09-11T17:00:00.000Z',
  cached: false,
  position: { total_cash: 150294.59, company_fenced: 96159.01, personal: 54135.58 },
  plan: { monthly_spend: 2167, runway_months: 25 },
  month: { month: '2026-09-01', to_be_budgeted: 37320, age_of_money: 0, income: 0, budgeted: 0, activity: 0 },
  attention: { uncategorised: 0, unapproved: 0, since: '2026-06-13' },
  assumptions: {
    company_group_matched: 'Fourfold (company)',
    spend_groups_counted: ['Bills', 'Needs', 'Subscriptions', 'Wants'],
    spend_groups_missing: [],
    lumpy_excluded: [{ name: 'Clothes', budgeted: 25, detected_by: 'goal' }],
    tracking_accounts_excluded: [],
    ...over,
  },
});

function pageWith(summary: MoneySummary): MoneyPage {
  const page = TestBed.inject(MoneyPage);
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(req => req.url.endsWith('/api/money/summary')).flush(summary);
  http.expectOne(req => req.url.endsWith('/api/money/categories')).flush({
    pulled_at: summary.pulled_at, cached: false, categories: [],
  });
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
