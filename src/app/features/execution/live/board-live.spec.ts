import { describe, it, expect } from 'vitest';
import { planRefresh } from './board-live';
import type { SystemEventSummary } from '@features/stream/stream.service';

let nextId = 1;

function event(over: Partial<SystemEventSummary> = {}): SystemEventSummary {
  return {
    id: nextId++,
    ts: '2026-08-15T09:00:00.000Z',
    source: 'vault',
    kind: 'note.reassigned',
    actor: 'jimbo',
    title: 'jimbo → marvin',
    level: 'info',
    ref_type: 'vault_note',
    ref_id: 'note-1',
    correlation_id: null,
    ...over,
  };
}

describe('planRefresh', () => {
  it('refreshes the note a card event names', () => {
    const plan = planRefresh([event({ id: 10, ref_id: 'note-7' })], 9);
    expect(plan.notes).toEqual(['note-7']);
    expect(plan.stripDirty).toBe(true);
  });

  // The stream carries ~2,700 events per 48h and almost none of them say
  // anything about a card. Reacting to all of them would make the board more
  // expensive live than static.
  it('ignores the noise that dominates the stream', () => {
    const plan = planRefresh([
      event({ id: 10, kind: 'tool.pre', source: 'hermes', ref_type: null, ref_id: null }),
      event({ id: 11, kind: 'heartbeat', source: 'hermes', ref_type: null, ref_id: null }),
      event({ id: 12, kind: 'email.ingested', source: 'email', ref_type: 'email_report', ref_id: 'x' }),
    ], 9);

    expect(plan).toEqual({ dispatches: [], notes: [], stripDirty: false });
  });

  it('skips anything at or below the watermark', () => {
    const plan = planRefresh([
      event({ id: 5, ref_id: 'old' }),
      event({ id: 9, ref_id: 'also-old' }),
      event({ id: 10, ref_id: 'new' }),
    ], 9);

    expect(plan.notes).toEqual(['new']);
  });

  // A commission goes approved → running → completed inside seconds. Fetching
  // it three times to render one card is the refetch this design replaces.
  it('collapses a dispatch that moved twice into one refresh', () => {
    const plan = planRefresh([
      event({ id: 10, kind: 'dispatch.stage_changed', source: 'dispatch', ref_id: 'note-3', correlation_id: 'dispatch:88' }),
      event({ id: 11, kind: 'dispatch.stage_changed', source: 'dispatch', ref_id: 'note-3', correlation_id: 'dispatch:88' }),
    ], 9);

    expect(plan.dispatches).toEqual(['88']);
    expect(plan.notes).toEqual(['note-3']);
  });

  // A commission moving through its stages hands nothing to the operator, so
  // it must not trigger a strip refetch on every tick of the pump.
  it('leaves the strip alone for dispatch movement', () => {
    const plan = planRefresh([
      event({ id: 10, kind: 'dispatch.stage_changed', source: 'dispatch', correlation_id: 'dispatch:1' }),
    ], 9);

    expect(plan.stripDirty).toBe(false);
  });

  it('marks the strip dirty for questions', () => {
    const raised = planRefresh([event({ id: 10, kind: 'question.raised', correlation_id: 'question:q1' })], 9);
    const answered = planRefresh([event({ id: 11, kind: 'question.answered', correlation_id: 'question:q1' })], 10);

    expect(raised.stripDirty).toBe(true);
    expect(answered.stripDirty).toBe(true);
  });

  it('ignores a correlation id that is not a dispatch handle', () => {
    const plan = planRefresh([
      event({ id: 10, kind: 'question.raised', correlation_id: 'question:q1' }),
      event({ id: 11, kind: 'dispatch.stage_changed', correlation_id: 'dispatch:not-a-number' }),
    ], 9);

    expect(plan.dispatches).toEqual([]);
  });

  it('does nothing for an empty batch', () => {
    expect(planRefresh([], 0)).toEqual({ dispatches: [], notes: [], stripDirty: false });
  });
});
