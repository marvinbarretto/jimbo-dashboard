export type VerbosityLevel = 'compact' | 'detailed' | 'debug';

const KEY = 'activity-log-verbosity';
const VALID: readonly VerbosityLevel[] = ['compact', 'detailed', 'debug'];

/**
 * Storage is passed in rather than read off the module global.
 *
 * These functions used to call `localStorage` directly. That breaks the
 * convention the rest of the app follows — ThemeService reaches storage through
 * `inject(DOCUMENT).defaultView` — and it made the unit tests depend on a
 * browser global the runner does not provide, so all four failed on
 * `localStorage.clear()` before a single assertion ran.
 *
 * `null` is a first-class argument, not an error: it is what a non-browser
 * context legitimately has, and both functions degrade to the default rather
 * than throwing.
 */
export type VerbosityStore = Pick<Storage, 'getItem' | 'setItem'> | null;

/**
 * Read the operator's saved verbosity, defaulting to `compact`.
 *
 * @param store Storage to read from; `null` when there is none.
 * @returns The stored level, or `'compact'` when absent, unrecognised, or unreadable.
 */
export function loadVerbosity(store: VerbosityStore): VerbosityLevel {
  if (!store) return 'compact';
  try {
    const v = store.getItem(KEY);
    return (VALID as readonly string[]).includes(v ?? '') ? (v as VerbosityLevel) : 'compact';
  } catch {
    // Safari in private mode throws on access rather than returning null.
    return 'compact';
  }
}

/**
 * Persist the operator's verbosity choice. Silent on failure — a preference
 * that will not save is not worth interrupting anyone over.
 *
 * @param store Storage to write to; `null` when there is none.
 * @param level The level to persist.
 */
export function saveVerbosity(store: VerbosityStore, level: VerbosityLevel): void {
  if (!store) return;
  try {
    store.setItem(KEY, level);
  } catch { /* swallow — quota / private mode */ }
}
