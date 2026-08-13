import { describe, expect, it } from 'vitest';
import { daypartAt, londonHour } from './daypart';

/** A London wall-clock hour in August (BST, UTC+1) as a real instant. */
const bst = (hour: number, minute = 0): Date =>
  new Date(Date.UTC(2026, 7, 13, hour - 1, minute));

/** A London wall-clock hour in January (GMT, UTC+0). */
const gmt = (hour: number, minute = 0): Date => new Date(Date.UTC(2026, 0, 13, hour, minute));

describe('londonHour', () => {
  it('reads the London hour, not the runner’s local one', () => {
    expect(londonHour(bst(14))).toBe(14);
    expect(londonHour(gmt(14))).toBe(14);
  });

  it('renders midnight as 0, not 24', () => {
    expect(londonHour(bst(0, 30))).toBe(0);
  });
});

describe('daypartAt', () => {
  it('opens the morning at the 04:00 logical-day cutover', () => {
    expect(daypartAt(bst(3, 59))).toBe('evening');
    expect(daypartAt(bst(4, 0))).toBe('morning');
  });

  it('turns over to midday at noon', () => {
    expect(daypartAt(bst(11, 59))).toBe('morning');
    expect(daypartAt(bst(12, 0))).toBe('midday');
  });

  it('turns over to evening at six', () => {
    expect(daypartAt(bst(17, 59))).toBe('midday');
    expect(daypartAt(bst(18, 0))).toBe('evening');
  });

  it('keeps the evening running past midnight, so the close-out card survives the witching hour', () => {
    expect(daypartAt(bst(23, 30))).toBe('evening');
    expect(daypartAt(bst(0, 15))).toBe('evening');
    expect(daypartAt(bst(3, 30))).toBe('evening');
  });

  it('holds the same boundaries through the GMT half of the year', () => {
    expect(daypartAt(gmt(3, 59))).toBe('evening');
    expect(daypartAt(gmt(4, 0))).toBe('morning');
    expect(daypartAt(gmt(18, 0))).toBe('evening');
  });

  it('answers for London even when the phone has gone abroad', () => {
    // 21:00 in New York on a BST day is 02:00 London the next morning — still
    // "evening" by the London clock, which is the one the data is bucketed on.
    const nyEvening = new Date('2026-08-13T21:00:00-04:00');
    expect(daypartAt(nyEvening)).toBe('evening');
  });
});
