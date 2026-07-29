import { describe, expect, it } from 'vitest';
import { parseBulletLines, serializeBulletLines } from './bullet-list.utils';

describe('parseBulletLines', () => {
  it('strips a leading "- " marker from each line', () => {
    expect(parseBulletLines('- one\n- two')).toEqual(['one', 'two']);
  });

  it('strips a leading "* " marker from each line', () => {
    expect(parseBulletLines('* one\n* two')).toEqual(['one', 'two']);
  });

  it('treats plain lines with no marker as rows too', () => {
    expect(parseBulletLines('one\ntwo')).toEqual(['one', 'two']);
  });

  it('drops empty lines', () => {
    expect(parseBulletLines('- one\n\n- two\n')).toEqual(['one', 'two']);
  });

  it('returns an empty array for null/undefined/empty input', () => {
    expect(parseBulletLines(null)).toEqual([]);
    expect(parseBulletLines(undefined)).toEqual([]);
    expect(parseBulletLines('')).toEqual([]);
  });
});

describe('serializeBulletLines', () => {
  it('joins lines with a "- " prefix', () => {
    expect(serializeBulletLines(['one', 'two'])).toBe('- one\n- two');
  });

  it('drops blank/whitespace-only entries', () => {
    expect(serializeBulletLines(['one', '  ', 'two'])).toBe('- one\n- two');
  });

  it('returns null when nothing is left', () => {
    expect(serializeBulletLines([])).toBeNull();
    expect(serializeBulletLines(['  ', ''])).toBeNull();
  });

  it('round-trips through parseBulletLines', () => {
    const original = '- one\n- two\n- three';
    expect(serializeBulletLines(parseBulletLines(original))).toBe(original);
  });
});
