import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach } from 'vitest';

import {
  withOptimisticUpdate,
  withOptimisticCreate,
  withOptimisticRemove,
} from './with-optimistic';

interface Row { id: string; title: string; status: 'a' | 'b' }

function makeToast(): { error: (m: string) => void; calls: string[] } {
  const calls: string[] = [];
  return { error: (m) => { calls.push(m); }, calls };
}

describe('withOptimisticUpdate', () => {
  let store: ReturnType<typeof signal<Row[]>>;

  beforeEach(() => {
    store = signal<Row[]>([
      { id: '1', title: 'one', status: 'a' },
      { id: '2', title: 'two', status: 'a' },
    ]);
  });

  it('splices next into the store before the request resolves', () => {
    const toast = makeToast();
    const prior = store()[0];
    const next: Row = { ...prior, status: 'b' };

    withOptimisticUpdate(store, toast, {
      prior,
      next,
      request: of({}),
      errorMessage: 'failed',
    });

    // Request resolved synchronously via `of()` — store reflects `next`.
    expect(store().find(r => r.id === '1')!.status).toBe('b');
    expect(toast.calls).toEqual([]);
  });

  it('rolls back to prior and toasts on request error', () => {
    const toast = makeToast();
    const prior = store()[0];
    const next: Row = { ...prior, status: 'b' };

    withOptimisticUpdate(store, toast, {
      prior,
      next,
      request: throwError(() => new Error('boom')),
      errorMessage: 'update failed',
    });

    expect(store().find(r => r.id === '1')!.status).toBe('a');
    expect(toast.calls).toEqual(['update failed']);
  });

  it('does not touch other rows on either success or rollback', () => {
    const toast = makeToast();
    const prior = store()[0];
    const next: Row = { ...prior, status: 'b' };

    withOptimisticUpdate(store, toast, {
      prior, next,
      request: throwError(() => new Error('boom')),
      errorMessage: 'failed',
    });

    expect(store().find(r => r.id === '2')!.status).toBe('a');
    expect(store()).toHaveLength(2);
  });

  it('invokes onSuccess with the response payload', () => {
    const toast = makeToast();
    const prior = store()[0];
    const next: Row = { ...prior, status: 'b' };
    let received: unknown = null;

    withOptimisticUpdate(store, toast, {
      prior, next,
      request: of({ confirmed: true }),
      errorMessage: 'failed',
      onSuccess: (r) => { received = r; },
    });

    expect(received).toEqual({ confirmed: true });
  });
});

describe('withOptimisticCreate', () => {
  let store: ReturnType<typeof signal<Row[]>>;

  beforeEach(() => {
    store = signal<Row[]>([{ id: 'existing', title: 'x', status: 'a' }]);
  });

  it('prepends the optimistic row immediately', () => {
    const toast = makeToast();
    const optimistic: Row = { id: 'temp-1', title: 'new', status: 'a' };

    withOptimisticCreate(store, toast, {
      optimistic,
      request: of({ id: 'real-1' }),
      realFromResponse: (r) => ({ ...optimistic, id: (r as { id: string }).id }),
      errorMessage: 'failed',
    });

    // After sync resolution: temp is replaced by real, but real should still
    // be in position 0 (we replace by temp id, not by index).
    expect(store()[0].id).toBe('real-1');
    expect(store()[1].id).toBe('existing');
  });

  it('swaps the temp id for the real id on success', () => {
    const toast = makeToast();
    const optimistic: Row = { id: 'temp-1', title: 'new', status: 'a' };
    let onSuccessReal: Row | null = null;

    withOptimisticCreate(store, toast, {
      optimistic,
      request: of({ id: 'real-1', extra: 'payload' }),
      realFromResponse: (r) => ({ ...optimistic, id: (r as { id: string }).id }),
      errorMessage: 'failed',
      onSuccess: (real) => { onSuccessReal = real; },
    });

    expect(store().some(r => r.id === 'temp-1')).toBe(false);
    expect(store().some(r => r.id === 'real-1')).toBe(true);
    expect(onSuccessReal).toEqual({ id: 'real-1', title: 'new', status: 'a' });
  });

  it('removes the temp row and toasts on error', () => {
    const toast = makeToast();
    const optimistic: Row = { id: 'temp-1', title: 'new', status: 'a' };

    withOptimisticCreate(store, toast, {
      optimistic,
      request: throwError(() => new Error('boom')),
      realFromResponse: (r) => ({ ...optimistic, id: (r as { id: string }).id }),
      errorMessage: 'create failed',
    });

    expect(store().some(r => r.id === 'temp-1')).toBe(false);
    expect(store()).toHaveLength(1);
    expect(toast.calls).toEqual(['create failed']);
  });
});

describe('withOptimisticRemove', () => {
  let store: ReturnType<typeof signal<Row[]>>;

  beforeEach(() => {
    store = signal<Row[]>([
      { id: '1', title: 'one', status: 'a' },
      { id: '2', title: 'two', status: 'a' },
    ]);
  });

  it('filters the row out of the store immediately', () => {
    const toast = makeToast();
    const prior = store()[0];

    withOptimisticRemove(store, toast, {
      prior,
      request: of({}),
      errorMessage: 'failed',
    });

    expect(store().some(r => r.id === '1')).toBe(false);
    expect(store()).toHaveLength(1);
  });

  it('restores the row and toasts on error', () => {
    const toast = makeToast();
    const prior = store()[0];

    withOptimisticRemove(store, toast, {
      prior,
      request: throwError(() => new Error('boom')),
      errorMessage: 'delete failed',
    });

    expect(store().some(r => r.id === '1')).toBe(true);
    expect(store()).toHaveLength(2);
    expect(toast.calls).toEqual(['delete failed']);
  });

  it('invokes onSuccess on confirmation', () => {
    const toast = makeToast();
    let confirmed = false;

    withOptimisticRemove(store, toast, {
      prior: store()[0],
      request: of({}),
      errorMessage: 'failed',
      onSuccess: () => { confirmed = true; },
    });

    expect(confirmed).toBe(true);
  });
});
