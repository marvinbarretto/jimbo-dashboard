import { describe, it, expect } from 'vitest';
import {
  createKanbanColumnLimit,
  parseColumnLimit,
  serializeColumnLimit,
  DEFAULT_COLUMN_LIMIT,
} from './column-limit';

const cards = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('createKanbanColumnLimit', () => {
  it('caps a column to the active limit', () => {
    const limit = createKanbanColumnLimit(10);
    expect(limit.take('a', cards(50))).toHaveLength(10);
  });

  it('returns the list untouched when it is under the cap', () => {
    const limit = createKanbanColumnLimit(10);
    const list = cards(3);
    expect(limit.take('a', list)).toBe(list);
  });

  it('keeps the head of the list, so the board sort survives the cap', () => {
    const limit = createKanbanColumnLimit(3);
    expect(limit.take('a', cards(10))).toEqual([0, 1, 2]);
  });

  it('grows one column by a cap per showMore, leaving others capped', () => {
    const limit = createKanbanColumnLimit(10);
    limit.showMore('a');
    expect(limit.take('a', cards(50))).toHaveLength(20);
    expect(limit.take('b', cards(50))).toHaveLength(10);

    limit.showMore('a');
    expect(limit.take('a', cards(50))).toHaveLength(30);
  });

  it('renders everything when uncapped, and ignores showMore', () => {
    const limit = createKanbanColumnLimit(null);
    limit.showMore('a');
    expect(limit.take('a', cards(500))).toHaveLength(500);
  });

  it('collapses expansions when the cap changes', () => {
    const limit = createKanbanColumnLimit(10);
    limit.showMore('a');
    limit.setLimit(50);
    expect(limit.take('a', cards(500))).toHaveLength(50);
  });

  it('collapses every column on collapseAll', () => {
    const limit = createKanbanColumnLimit(10);
    limit.showMore('a');
    limit.showMore('b');
    limit.collapseAll();
    expect(limit.take('a', cards(50))).toHaveLength(10);
    expect(limit.take('b', cards(50))).toHaveLength(10);
  });
});

describe('parseColumnLimit', () => {
  it('reads a numeric cap', () => {
    expect(parseColumnLimit('25')).toBe(25);
  });

  it('reads "all" as uncapped', () => {
    expect(parseColumnLimit('all')).toBeNull();
  });

  it('returns undefined for an absent or junk param, so the default survives', () => {
    expect(parseColumnLimit(null)).toBeUndefined();
    expect(parseColumnLimit('')).toBeUndefined();
    expect(parseColumnLimit('nonsense')).toBeUndefined();
    expect(parseColumnLimit('0')).toBeUndefined();
    expect(parseColumnLimit('-5')).toBeUndefined();
    expect(parseColumnLimit('2.5')).toBeUndefined();
  });
});

describe('serializeColumnLimit', () => {
  it('omits the default so a plain board link stays plain', () => {
    expect(serializeColumnLimit(DEFAULT_COLUMN_LIMIT)).toBeNull();
  });

  it('round-trips a non-default cap', () => {
    expect(parseColumnLimit(serializeColumnLimit(50))).toBe(50);
    expect(parseColumnLimit(serializeColumnLimit(null))).toBeNull();
  });
});
