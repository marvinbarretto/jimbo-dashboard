import { describe, expect, it } from 'vitest';
import { isLiveDay } from './datetime.utils';

// The four-hour window where the calendar date and the working day disagree.
// Getting this wrong blanked the journal's day-stream sections nightly, so the
// boundary is pinned here rather than left to a reader's assumption.
describe('isLiveDay', () => {
  it('treats the small hours as still belonging to the day that is ending', () => {
    // 00:30 on the 26th, London — the working day is still the 25th.
    const justAfterMidnight = new Date('2026-08-26T00:30:00+01:00');
    expect(isLiveDay('2026-08-25', justAfterMidnight)).toBe(true);
    expect(isLiveDay('2026-08-26', justAfterMidnight)).toBe(false);
  });

  it('rolls over at 04:00, not midnight', () => {
    expect(isLiveDay('2026-08-25', new Date('2026-08-26T03:59:00+01:00'))).toBe(true);
    expect(isLiveDay('2026-08-26', new Date('2026-08-26T04:01:00+01:00'))).toBe(true);
  });

  it('is the plain calendar day for the rest of the day', () => {
    const afternoon = new Date('2026-08-26T14:00:00+01:00');
    expect(isLiveDay('2026-08-26', afternoon)).toBe(true);
    expect(isLiveDay('2026-08-25', afternoon)).toBe(false);
  });
});
