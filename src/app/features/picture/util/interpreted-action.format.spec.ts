import { describe, it, expect } from 'vitest';
import { formatInterpretedAction } from './interpreted-action.format';
import type { InterpretedAction } from '@domain/clarifications';

describe('formatInterpretedAction', () => {
  it('formats update_vault_note with the appended text as detail', () => {
    const a: InterpretedAction = { action: 'update_vault_note', note_id: 'LOC-1', append_body: 'flexible on Lisbon dates' };
    const r = formatInterpretedAction(a);
    expect(r.summary).toBe('Updated vault note');
    expect(r.detail).toBe('flexible on Lisbon dates');
  });

  it('formats archive_vault_note with the reason as detail', () => {
    const a: InterpretedAction = { action: 'archive_vault_note', note_id: 'LOC-2', reason: 'already done' };
    const r = formatInterpretedAction(a);
    expect(r.summary).toBe('Archived vault note');
    expect(r.detail).toBe('already done');
  });

  it('formats create_task with the title in the summary and body as detail', () => {
    const a: InterpretedAction = { action: 'create_task', title: 'Chase invoice', body: 'follow up with client' };
    const r = formatInterpretedAction(a);
    expect(r.summary).toBe('Created task "Chase invoice"');
    expect(r.detail).toBe('follow up with client');
  });

  it('formats ephemeral_context with a timeframe in the summary when present', () => {
    const a: InterpretedAction = { action: 'ephemeral_context', content: 'working from Lisbon', timeframe: 'this week', expires_at_days: 7 };
    const r = formatInterpretedAction(a);
    expect(r.summary).toBe('Noted for this week');
    expect(r.detail).toBe('working from Lisbon');
  });

  it('formats ephemeral_context without a timeframe as plain "Noted"', () => {
    const a: InterpretedAction = { action: 'ephemeral_context', content: 'prefers async updates', timeframe: null, expires_at_days: null };
    const r = formatInterpretedAction(a);
    expect(r.summary).toBe('Noted');
    expect(r.detail).toBe('prefers async updates');
  });

  it('formats noop with the reason as detail, and null detail when no reason given', () => {
    const withReason = formatInterpretedAction({ action: 'noop', reason: 'not sure' });
    expect(withReason.summary).toBe('No action taken');
    expect(withReason.detail).toBe('not sure');

    const withoutReason = formatInterpretedAction({ action: 'noop', reason: '' });
    expect(withoutReason.detail).toBeNull();
  });
});
