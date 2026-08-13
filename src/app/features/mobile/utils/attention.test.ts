import { describe, expect, it } from 'vitest';
import { buildAttention, type AttentionInput } from './attention';

const attention = (over: Partial<AttentionInput> = {}) =>
  buildAttention({
    waitingOnMarvin: 0,
    checksRemaining: 0,
    checksCostLabel: '',
    closeDayOnScreen: false,
    ...over,
  });

describe('buildAttention — dispatch', () => {
  it('surfaces jobs waiting on a decision', () => {
    expect(attention({ waitingOnMarvin: 20 })).toEqual([
      {
        id: 'dispatch',
        label: '20 waiting on you',
        srLabel: '20 dispatch jobs waiting on you',
        route: '/review',
      },
    ]);
  });

  it('reads a single job as one job', () => {
    expect(attention({ waitingOnMarvin: 1 })[0].srLabel).toBe('1 dispatch job waiting on you');
  });

  it('says nothing when the queue is clear', () => {
    // A calm "0 waiting" still costs a glance; silence is the correct render.
    expect(attention({ waitingOnMarvin: 0 })).toEqual([]);
  });

  it('says nothing before live-status has answered', () => {
    expect(attention({ waitingOnMarvin: undefined })).toEqual([]);
    expect(attention({ waitingOnMarvin: null })).toEqual([]);
  });
});

describe('buildAttention — day checks', () => {
  it('leads the count with what finishing would cost', () => {
    expect(attention({ checksRemaining: 3, checksCostLabel: '~25s left' })[0]).toMatchObject({
      id: 'day-checks',
      label: '3 checks unanswered · ~25s left',
      route: '/evening',
    });
  });

  it('drops the cost clause rather than rendering a dangling separator', () => {
    expect(attention({ checksRemaining: 3, checksCostLabel: '' })[0].label).toBe(
      '3 checks unanswered',
    );
  });

  it('reads a single check as one check', () => {
    expect(attention({ checksRemaining: 1, checksCostLabel: '~5s left' })[0].srLabel).toBe(
      '1 day check unanswered',
    );
  });

  it('goes quiet once the list is done', () => {
    expect(attention({ checksRemaining: 0 })).toEqual([]);
  });

  // The close-out card's entire subject is the tick-list. Repeating it two
  // rows below is how a screen starts reading as a nag.
  it('stands down while the close-out card is already saying it', () => {
    expect(attention({ checksRemaining: 3, checksCostLabel: '~25s left', closeDayOnScreen: true })).toEqual(
      [],
    );
  });

  it('still surfaces dispatch while the close-out card is up', () => {
    const items = attention({
      waitingOnMarvin: 4,
      checksRemaining: 3,
      closeDayOnScreen: true,
    });
    expect(items.map((i) => i.id)).toEqual(['dispatch']);
  });
});

describe('buildAttention — the row as a whole', () => {
  it('renders nothing at all on a quiet day', () => {
    // The container hides the row on an empty list; this is what makes that work.
    expect(attention()).toEqual([]);
  });

  it('keeps dispatch above the tick-list — a blocked job outranks a checkbox', () => {
    const items = attention({ waitingOnMarvin: 2, checksRemaining: 3, checksCostLabel: '~25s left' });
    expect(items.map((i) => i.id)).toEqual(['dispatch', 'day-checks']);
  });

  it('never invents a row from the blocker backlog', () => {
    // 22 blockers on the live call — a permanent badge trains dismissal, so
    // buildAttention takes no blocker input at all.
    expect(attention({ waitingOnMarvin: 0, checksRemaining: 0 })).toEqual([]);
  });
});
