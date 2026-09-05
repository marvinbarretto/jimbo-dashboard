import { describe, it, expect, beforeEach } from 'vitest';
import { loadVerbosity, saveVerbosity, type VerbosityLevel, type VerbosityStore } from './verbosity';

// These tests used to call `localStorage.clear()` in beforeEach and all four
// died on it — the runner provides no browser globals, so every case failed
// before reaching an assertion. Passing a store in is the fix at both ends: the
// production code follows the app's DI convention (ThemeService reaches storage
// through DOCUMENT), and the tests exercise the real branches, including the
// two a real localStorage cannot easily be made to take.

/** In-memory Storage stand-in — a real Map, not a mock, so it behaves like one. */
function fakeStore(seed: Record<string, string> = {}): VerbosityStore {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe('verbosity persistence', () => {
  let store: VerbosityStore;
  beforeEach(() => { store = fakeStore(); });

  it('returns "compact" by default when nothing stored', () => {
    expect(loadVerbosity(store)).toBe('compact');
  });

  it('round-trips a saved value', () => {
    saveVerbosity(store, 'debug');
    expect(loadVerbosity(store)).toBe('debug');
  });

  it('falls back to "compact" on a corrupt value', () => {
    expect(loadVerbosity(fakeStore({ 'activity-log-verbosity': 'banana' }))).toBe('compact');
  });

  it('handles every level in the union', () => {
    const levels: VerbosityLevel[] = ['compact', 'detailed', 'debug'];
    levels.forEach(l => {
      saveVerbosity(store, l);
      expect(loadVerbosity(store)).toBe(l);
    });
  });

  // The case that actually broke: no browser, so DOCUMENT.defaultView is null
  // and the component passes null through. Must default, not throw.
  it('defaults without throwing when there is no storage at all', () => {
    expect(loadVerbosity(null)).toBe('compact');
    expect(() => saveVerbosity(null, 'debug')).not.toThrow();
  });

  // Safari in private mode throws on access rather than returning null.
  it('defaults when storage throws on read', () => {
    const hostile: VerbosityStore = {
      getItem: () => { throw new DOMException('denied'); },
      setItem: () => { /* unused */ },
    };
    expect(loadVerbosity(hostile)).toBe('compact');
  });

  it('does not propagate a write failure to the caller', () => {
    const full: VerbosityStore = {
      getItem: () => null,
      setItem: () => { throw new DOMException('QuotaExceededError'); },
    };
    expect(() => saveVerbosity(full, 'detailed')).not.toThrow();
  });
});
