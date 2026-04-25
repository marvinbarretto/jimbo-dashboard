import { ageInDays, staleNorm, ancientNorm, STALE_DAYS, ANCIENT_DAYS } from './staleness';
import { buildVaultItem, daysAgo } from './vault-item.test-helpers';

describe('staleness', () => {
  // Frozen clock — every relative date is reproducible across runs.
  const NOW_ISO = '2026-04-25T12:00:00.000Z';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW_ISO));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ageInDays', () => {
    it('returns 0 when reference is now', () => {
      expect(ageInDays(NOW_ISO)).toBe(0);
    });

    it('returns positive days for past dates', () => {
      expect(ageInDays(daysAgo(7))).toBe(7);
    });

    it('returns negative for future dates', () => {
      expect(ageInDays(daysAgo(-3))).toBeCloseTo(-3, 5);
    });

    it('handles fractional days', () => {
      const halfDayAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      expect(ageInDays(halfDayAgo)).toBeCloseTo(0.5, 5);
    });
  });

  describe('staleNorm', () => {
    it('returns 0 for items created right now', () => {
      const item = buildVaultItem({ created_at: NOW_ISO });
      expect(staleNorm(item)).toBe(0);
    });

    it('reaches 1 exactly at STALE_DAYS', () => {
      const item = buildVaultItem({ created_at: daysAgo(STALE_DAYS) });
      expect(staleNorm(item)).toBe(1);
    });

    it('clamps to 1 well beyond STALE_DAYS', () => {
      const item = buildVaultItem({ created_at: daysAgo(STALE_DAYS * 10) });
      expect(staleNorm(item)).toBe(1);
    });

    it('clamps to 0 for future created_at', () => {
      const item = buildVaultItem({ created_at: daysAgo(-5) });
      expect(staleNorm(item)).toBe(0);
    });

    it('uses sqrt curve — 2d and 5d are clearly distinct', () => {
      // The whole point of switching to sqrt: front-load discrimination at low ages.
      // Linear over 7d: 2/7 ≈ 0.29, 5/7 ≈ 0.71 — diff 0.43 (already wide).
      // Sqrt over 7d:   √(2/7) ≈ 0.53, √(5/7) ≈ 0.85 — diff 0.32 but pulls the lower
      // value much higher (0.53 vs 0.29), so a 2-day card already reads "noticeably aged".
      const at2 = buildVaultItem({ created_at: daysAgo(2) });
      const at5 = buildVaultItem({ created_at: daysAgo(5) });
      const r2 = staleNorm(at2);
      const r5 = staleNorm(at5);
      expect(r2).toBeGreaterThan(0.4);  // sqrt makes 2d already prominent
      expect(r5).toBeGreaterThan(r2 + 0.2);
      expect(r5).toBeLessThan(1);
    });

    it('lastActivityAt overrides created_at when fresher', () => {
      const item = buildVaultItem({ created_at: daysAgo(20) });
      expect(staleNorm(item, daysAgo(1))).toBeLessThan(staleNorm(item));
    });

    it('falls back to created_at when lastActivityAt is null', () => {
      const item = buildVaultItem({ created_at: daysAgo(3) });
      expect(staleNorm(item, null)).toBe(staleNorm(item));
    });
  });

  describe('ancientNorm', () => {
    it('reaches 1 exactly at ANCIENT_DAYS', () => {
      const item = buildVaultItem({ created_at: daysAgo(ANCIENT_DAYS) });
      expect(ancientNorm(item)).toBe(1);
    });

    it('grows slower than staleNorm at the same age', () => {
      // staleNorm uses STALE_DAYS as ceiling; ancientNorm uses ANCIENT_DAYS (much larger).
      // So the same days-old produces a smaller ancientNorm.
      const item = buildVaultItem({ created_at: daysAgo(STALE_DAYS) });
      expect(ancientNorm(item)).toBeLessThan(staleNorm(item));
    });

    it('is non-zero by the time staleNorm caps', () => {
      // At STALE_DAYS, ancientNorm should already be growing — both ramps overlap.
      const item = buildVaultItem({ created_at: daysAgo(STALE_DAYS) });
      expect(ancientNorm(item)).toBeGreaterThan(0);
    });
  });

  describe('threshold contract', () => {
    it('STALE_DAYS is smaller than ANCIENT_DAYS', () => {
      expect(STALE_DAYS).toBeLessThan(ANCIENT_DAYS);
    });
  });
});
