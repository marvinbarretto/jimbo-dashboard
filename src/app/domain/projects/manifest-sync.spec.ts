import { describe, expect, it } from 'vitest';
import { SYNC_OVERDUE_MS, isSyncOverdue } from './manifest-sync';

// Fixed epoch — no ambient clock, so these can't drift or flake.
const NOW = new Date('2026-08-07T12:00:00Z').getTime();
const agoMs = (ms: number) => new Date(NOW - ms).toISOString();
const HOUR = 60 * 60 * 1000;

describe('isSyncOverdue', () => {
  it('is false for a sweep inside the interval', () => {
    expect(isSyncOverdue(agoMs(2 * HOUR), NOW)).toBe(false);
    expect(isSyncOverdue(agoMs(71 * HOUR), NOW)).toBe(false);
  });

  // Grace exists because launchd coalesces runs missed while the laptop slept,
  // so a late sweep after a weekend away is normal, not a fault.
  it('is false inside the grace window past the interval', () => {
    expect(isSyncOverdue(agoMs(80 * HOUR), NOW)).toBe(false);
  });

  it('is true once interval + grace has elapsed', () => {
    expect(isSyncOverdue(agoMs(SYNC_OVERDUE_MS + HOUR), NOW)).toBe(true);
  });

  // The real incident: dead since 2026-07-02, page said "6 weeks ago" and
  // looked fine.
  it('is true for the five-week outage that went unnoticed', () => {
    expect(isSyncOverdue('2026-07-02T00:47:29Z', NOW)).toBe(true);
  });

  it('is exactly at the boundary, not over it', () => {
    expect(isSyncOverdue(agoMs(SYNC_OVERDUE_MS), NOW)).toBe(false);
  });

  // A project with no manifest is dashboard-owned; nothing is meant to sweep
  // it, so it must never be reported as overdue.
  it('is false for a project that has never been synced', () => {
    expect(isSyncOverdue(null, NOW)).toBe(false);
    expect(isSyncOverdue(undefined, NOW)).toBe(false);
  });

  it('is false rather than throwing on an unparseable timestamp', () => {
    expect(isSyncOverdue('not-a-date', NOW)).toBe(false);
  });
});
