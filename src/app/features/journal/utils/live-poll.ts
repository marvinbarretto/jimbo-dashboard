import { DOCUMENT, DestroyRef, inject } from '@angular/core';

/**
 * Refresh timer for a "live" journal period, wired to tab visibility.
 *
 * Journal pages keep today's bundle fresh on an interval. A hidden tab has no
 * one looking at it, but the timer kept firing regardless — and each
 * /api/journal/day round trip fans out to one Google Calendar request per
 * configured calendar, so a dashboard left open overnight burnt quota for
 * pixels nobody saw. Ticks are skipped while hidden and one runs immediately
 * on the way back, so returning to the tab still shows current data.
 *
 * Call from an injection context; teardown is registered on the caller's
 * DestroyRef.
 */
export function pollWhileVisible(tick: () => void, periodMs = 60_000): void {
  const document = inject(DOCUMENT);

  const run = (): void => {
    if (document.hidden) return;
    tick();
  };

  const id = setInterval(run, periodMs);
  const onVisibility = (): void => {
    if (!document.hidden) tick();
  };
  document.addEventListener('visibilitychange', onVisibility);

  inject(DestroyRef).onDestroy(() => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', onVisibility);
  });
}
