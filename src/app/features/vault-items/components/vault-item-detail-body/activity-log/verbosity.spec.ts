import { describe, it, expect, beforeEach } from 'vitest';
import { loadVerbosity, saveVerbosity, type VerbosityLevel } from './verbosity';

describe('verbosity persistence', () => {
  beforeEach(() => localStorage.clear());

  it('returns "compact" by default when nothing stored', () => {
    expect(loadVerbosity()).toBe('compact');
  });

  it('round-trips a saved value', () => {
    saveVerbosity('debug');
    expect(loadVerbosity()).toBe('debug');
  });

  it('falls back to "compact" on a corrupt value', () => {
    localStorage.setItem('activity-log-verbosity', 'banana');
    expect(loadVerbosity()).toBe('compact');
  });

  it('handles every level in the union', () => {
    const levels: VerbosityLevel[] = ['compact', 'detailed', 'debug'];
    levels.forEach(l => {
      saveVerbosity(l);
      expect(loadVerbosity()).toBe(l);
    });
  });
});
