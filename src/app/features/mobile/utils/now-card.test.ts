import { describe, expect, it } from 'vitest';
import { selectNowCard, type ActiveFocus, type NowCardInput } from './now-card';
import type { ChecksProgress } from './day-checks-progress';
import type { ShapeBlock } from './day-shape';

const NOTHING_LEFT: ChecksProgress = { answered: 8, total: 8, remaining: 0, costLabel: '' };
const CHECKS_LEFT: ChecksProgress = { answered: 5, total: 8, remaining: 3, costLabel: '~25s left' };
const SHAPE: readonly ShapeBlock[] = [{ lead: '09:30', title: 'Ship the NOW card', meta: 'jimbo' }];

const running = (over: Partial<ActiveFocus> = {}): ActiveFocus => ({
  startedAt: '2026-08-13T09:00:00Z',
  plannedSeconds: 25 * 60,
  notes: 'Slice 2',
  ...over,
});

const card = (over: Partial<NowCardInput> = {}) =>
  selectNowCard({
    now: new Date('2026-08-13T09:10:00Z'),
    day: '2026-08-13',
    focus: null,
    checks: NOTHING_LEFT,
    shape: [],
    ...over,
  });

describe('selectNowCard — priority is state first', () => {
  // Being mid-session is a fact about right now; the clock doesn't get to
  // override it. Assert every daypart so a future tiebreak can't quietly win.
  it.each([
    ['morning', '2026-08-13T08:00:00Z'],
    ['midday', '2026-08-13T13:00:00Z'],
    ['evening', '2026-08-13T20:00:00Z'],
    ['past midnight', '2026-08-14T01:00:00Z'],
  ])('lets a running session win in the %s', (_daypart, iso) => {
    const now = new Date(iso);
    const result = card({
      now,
      focus: running({ startedAt: iso, plannedSeconds: 1500 }),
      checks: CHECKS_LEFT,
      shape: SHAPE,
    });
    expect(result.kind).toBe('focus');
  });

  it('falls to the evening close-out only once nothing is running', () => {
    expect(card({ now: new Date('2026-08-13T20:00:00Z'), checks: CHECKS_LEFT }).kind).toBe(
      'close-day',
    );
  });
});

describe('selectNowCard — the focus card', () => {
  it('counts down in whole minutes, rounding up so it never reads zero while running', () => {
    const result = card({
      now: new Date('2026-08-13T09:07:30Z'),
      focus: running(),
    });
    expect(result).toMatchObject({ kind: 'focus', remaining: '18m left' });
  });

  it('splits into hours once the minutes stop being readable', () => {
    const result = card({
      now: new Date('2026-08-13T09:10:00Z'),
      focus: running({ plannedSeconds: 90 * 60 }),
    });
    expect(result).toMatchObject({ remaining: '1h 20m left' });
  });

  it('keeps showing an overrun session, and says by how much', () => {
    // Still status: running server-side — the card's job is to offer Complete.
    const result = card({
      now: new Date('2026-08-13T09:28:00Z'),
      focus: running(),
    });
    expect(result).toMatchObject({ kind: 'focus', remaining: '3m over', percent: 100 });
  });

  it('says time is up in the first minute past the buzzer, not "0m over"', () => {
    const result = card({ now: new Date('2026-08-13T09:25:20Z'), focus: running() });
    expect(result).toMatchObject({ remaining: "time's up" });
  });

  it('reports elapsed progress, clamped at both ends', () => {
    expect(card({ now: new Date('2026-08-13T09:00:00Z'), focus: running() })).toMatchObject({
      percent: 0,
    });
    expect(card({ now: new Date('2026-08-13T09:12:30Z'), focus: running() })).toMatchObject({
      percent: 50,
    });
    // A clock skew that puts "now" before the start must not go negative.
    expect(card({ now: new Date('2026-08-13T08:58:00Z'), focus: running() })).toMatchObject({
      percent: 0,
    });
  });

  it('titles the card with the declared intention', () => {
    expect(card({ focus: running({ notes: 'Slice 2' }) })).toMatchObject({ title: 'Slice 2' });
  });

  it('falls back to a generic title when the session declared nothing', () => {
    expect(card({ focus: running({ notes: null }) })).toMatchObject({ title: 'Focus session' });
    expect(card({ focus: running({ notes: '   ' }) })).toMatchObject({ title: 'Focus session' });
  });

  it('never claims it can extend in place — the PATCH payload has no planned_seconds', () => {
    expect(card({ focus: running() })).toMatchObject({ canExtend: false });
  });
});

describe('selectNowCard — the close-day card', () => {
  it('carries the tick-list state and its time cost', () => {
    const result = card({ now: new Date('2026-08-13T20:00:00Z'), checks: CHECKS_LEFT });
    expect(result).toEqual({
      kind: 'close-day',
      dayLabel: 'Thu 13 Aug',
      answered: 5,
      total: 8,
      costLabel: '~25s left',
      actionLabel: 'Answer 3 checks',
    });
  });

  // Shipped as "Answer 7 7 checks": pluralise() emits the count itself, and the
  // label was being assembled in the component where no test could see it.
  it('counts the outstanding checks exactly once in the button label', () => {
    const seven: ChecksProgress = { answered: 0, total: 7, remaining: 7, costLabel: '~2m left' };
    const result = card({ now: new Date('2026-08-13T20:00:00Z'), checks: seven });
    expect(result).toMatchObject({ actionLabel: 'Answer 7 checks' });
  });

  it('drops the plural for a single outstanding check', () => {
    const one: ChecksProgress = { answered: 6, total: 7, remaining: 1, costLabel: '~5s left' };
    expect(card({ now: new Date('2026-08-13T20:00:00Z'), checks: one })).toMatchObject({
      actionLabel: 'Answer 1 check',
    });
  });

  it('still offers to close yesterday after midnight, since the day runs to 04:00', () => {
    // injectLogicalToday() still reports the 13th at 01:30 — the card must
    // agree with it rather than vanishing for four hours.
    const result = card({
      now: new Date('2026-08-14T01:30:00Z'),
      day: '2026-08-13',
      checks: CHECKS_LEFT,
    });
    expect(result).toMatchObject({ kind: 'close-day', dayLabel: 'Thu 13 Aug' });
  });

  it('goes quiet once the list is done rather than congratulating itself', () => {
    expect(card({ now: new Date('2026-08-13T20:00:00Z'), checks: NOTHING_LEFT }).kind).toBe('idle');
  });

  it('stays away when no checks are configured at all', () => {
    const none: ChecksProgress = { answered: 0, total: 0, remaining: 0, costLabel: '' };
    expect(card({ now: new Date('2026-08-13T20:00:00Z'), checks: none }).kind).toBe('idle');
  });

  it('does not pre-empt the morning with checks that are still outstanding', () => {
    expect(card({ now: new Date('2026-08-13T08:00:00Z'), checks: CHECKS_LEFT }).kind).toBe('idle');
  });
});

describe('selectNowCard — the shape card', () => {
  it('lays the day out in the morning', () => {
    const result = card({ now: new Date('2026-08-13T08:00:00Z'), shape: SHAPE });
    expect(result).toEqual({ kind: 'shape', blocks: SHAPE });
  });

  it('does not re-propose a plan the day has already overtaken', () => {
    expect(card({ now: new Date('2026-08-13T13:00:00Z'), shape: SHAPE }).kind).toBe('idle');
    expect(card({ now: new Date('2026-08-13T20:00:00Z'), shape: SHAPE }).kind).toBe('idle');
  });

  it('stays silent when the briefing carried no shape', () => {
    // The pre-dawn 404 and today's production data both land here.
    expect(card({ now: new Date('2026-08-13T08:00:00Z'), shape: [] }).kind).toBe('idle');
  });
});

describe('selectNowCard — daypart boundaries', () => {
  const at = (iso: string) =>
    card({ now: new Date(iso), checks: CHECKS_LEFT, shape: SHAPE }).kind;

  it('opens the morning at 04:00 London, not before', () => {
    // 02:59Z / 03:00Z are 03:59 / 04:00 BST.
    expect(at('2026-08-13T02:59:00Z')).toBe('close-day');
    expect(at('2026-08-13T03:00:00Z')).toBe('shape');
  });

  it('closes the morning at midday London', () => {
    expect(at('2026-08-13T10:59:00Z')).toBe('shape');
    expect(at('2026-08-13T11:00:00Z')).toBe('idle');
  });

  it('opens the evening at 18:00 London', () => {
    expect(at('2026-08-13T16:59:00Z')).toBe('idle');
    expect(at('2026-08-13T17:00:00Z')).toBe('close-day');
  });

  it('reads the clock in London, never on the device', () => {
    // The same UTC instant is 18:30 in a BST summer and 17:30 in a GMT winter,
    // so it changes daypart — which is precisely what a device clock, or a
    // fixed UTC offset, would get wrong.
    expect(at('2026-08-13T17:30:00Z')).toBe('close-day');
    expect(
      card({ now: new Date('2026-01-15T17:30:00Z'), checks: CHECKS_LEFT, shape: SHAPE }).kind,
    ).toBe('idle');
  });
});
