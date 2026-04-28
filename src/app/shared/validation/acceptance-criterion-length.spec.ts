import { describe, it, expect } from 'vitest';
import { acceptanceCriterionStatus } from './acceptance-criterion-length';

describe('acceptanceCriterionStatus', () => {
  it('returns "clean" for 0–120 char inputs', () => {
    expect(acceptanceCriterionStatus('User can filter')).toBe('clean');
    expect(acceptanceCriterionStatus('a'.repeat(120))).toBe('clean');
  });

  it('returns "verbose" for 121–200 char inputs', () => {
    expect(acceptanceCriterionStatus('a'.repeat(121))).toBe('verbose');
    expect(acceptanceCriterionStatus('a'.repeat(200))).toBe('verbose');
  });

  it('returns "exceeds" for >200 char inputs', () => {
    expect(acceptanceCriterionStatus('a'.repeat(201))).toBe('exceeds');
    expect(acceptanceCriterionStatus('a'.repeat(500))).toBe('exceeds');
  });

  it('handles empty string as clean (no policy violation)', () => {
    expect(acceptanceCriterionStatus('')).toBe('clean');
  });
});
