import { describe, expect, it } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases and joins words with single dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('collapses runs of whitespace and punctuation', () => {
    expect(slugify('Foo   ___  Bar!!')).toBe('foo-bar');
  });

  it('strips leading and trailing dashes', () => {
    expect(slugify('  -- Edge --  ')).toBe('edge');
  });

  it('strips diacritics', () => {
    expect(slugify('Café Crème')).toBe('cafe-creme');
  });

  it('expands ampersands to "and"', () => {
    expect(slugify('Rock & Roll')).toBe('rock-and-roll');
  });

  it('passes through clean slugs', () => {
    expect(slugify('jimbo-hermes')).toBe('jimbo-hermes');
  });

  it('preserves digits', () => {
    expect(slugify('Project 42')).toBe('project-42');
  });

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });

  it('returns empty string when input is only separators', () => {
    expect(slugify('   ---   ')).toBe('');
  });
});
