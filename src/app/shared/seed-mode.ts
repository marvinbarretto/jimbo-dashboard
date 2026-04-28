// Dev-only toggle. When `?seed=1` is in the URL, services short-circuit their HTTP
// loaders and return SEED data instead. Lets us eyeball domain fixtures through the
// real screens without touching the API. Intentionally URL-based so a copy-pasted link
// reproduces the exact view someone wants to show.

let cached: boolean | null = null;

export function isSeedMode(): boolean {
  if (cached !== null) return cached;
  if (typeof window === 'undefined') return (cached = false);
  cached = new URLSearchParams(window.location.search).get('seed') === '1';
  return cached;
}

export function resetSeedModeCache(): void {
  cached = null;
}
