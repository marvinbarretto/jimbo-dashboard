export type VerbosityLevel = 'compact' | 'detailed' | 'debug';

const KEY = 'activity-log-verbosity';
const VALID: readonly VerbosityLevel[] = ['compact', 'detailed', 'debug'];

export function loadVerbosity(): VerbosityLevel {
  try {
    const v = localStorage.getItem(KEY);
    return (VALID as readonly string[]).includes(v ?? '') ? (v as VerbosityLevel) : 'compact';
  } catch {
    return 'compact';
  }
}

export function saveVerbosity(level: VerbosityLevel): void {
  try {
    localStorage.setItem(KEY, level);
  } catch { /* swallow — quota / private mode */ }
}
