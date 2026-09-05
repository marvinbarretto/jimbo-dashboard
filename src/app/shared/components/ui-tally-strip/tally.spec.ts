import { tallyTicks, tintShare } from './tally';

describe('tintShare', () => {
  it('leaves the first tick pure tint', () => {
    expect(tintShare(1, 30)).toBe(100);
  });

  it('spends the tint entirely at the cap', () => {
    expect(tintShare(30, 30)).toBe(0);
  });

  it('falls linearly between', () => {
    // Tick 15 of 30 sits one short of halfway through 29 steps.
    expect(tintShare(15, 30)).toBe(52);
    expect(tintShare(16, 30)).toBe(48);
  });

  it('treats a cap of one as pure tint rather than dividing by zero', () => {
    expect(tintShare(1, 1)).toBe(100);
  });

  it('clamps past the cap instead of going negative', () => {
    expect(tintShare(45, 30)).toBe(0);
  });
});

describe('tallyTicks', () => {
  it('draws one tick per unit', () => {
    expect(tallyTicks(5, 30, 0, false)).toHaveLength(5);
  });

  it('floors fractional counts — a part-day is not a mark', () => {
    expect(tallyTicks(5.9, 30, 0, false)).toHaveLength(5);
  });

  it('draws nothing at zero', () => {
    expect(tallyTicks(0, 30, 7, false)).toEqual([]);
  });

  it('never draws a negative count', () => {
    expect(tallyTicks(-3, 30, 7, false)).toEqual([]);
  });

  it('stops at the cap', () => {
    expect(tallyTicks(41, 30, 0, false)).toHaveLength(30);
  });

  it('gaps every groupBy ticks, starting at the group boundary', () => {
    const gaps = tallyTicks(15, 30, 7, false)
      .map((t, i) => (t.gap ? i + 1 : null))
      .filter(Boolean);
    expect(gaps).toEqual([8, 15]);
  });

  it('never gaps the first tick', () => {
    expect(tallyTicks(3, 30, 1, false)[0]!.gap).toBe(false);
  });

  it('omits gaps entirely when grouping is off', () => {
    expect(tallyTicks(20, 30, 0, false).every(t => !t.gap)).toBe(true);
  });

  it('pads to the cap with unfilled ticks when the runway is shown', () => {
    const ticks = tallyTicks(4, 30, 7, true);
    expect(ticks).toHaveLength(30);
    expect(ticks.filter(t => t.filled)).toHaveLength(4);
  });

  it('keeps the ramp anchored to the cap, not to the count', () => {
    // A 5-day strip must not race to alarm just because it is short: its ticks
    // carry the same shares the first five of a 30-day strip do.
    const short = tallyTicks(5, 30, 0, false).map(t => t.tintShare);
    const long = tallyTicks(30, 30, 0, false).slice(0, 5).map(t => t.tintShare);
    expect(short).toEqual(long);
  });
});
