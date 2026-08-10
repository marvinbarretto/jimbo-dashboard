import { DOCUMENT, DestroyRef, type Signal, inject, signal } from '@angular/core';
import { logicalToday } from '@shared/utils/datetime.utils';

/**
 * The logical day (04:00 Europe/London cutover) as a signal that survives the
 * phone shell's lifetime.
 *
 * /m components live in a persistent Capacitor WebView that gets backgrounded
 * and resumed across days — a day key captured at construction goes stale and
 * makes "Today" lie. Re-checked whenever the page becomes visible again;
 * anything derived (httpResource URLs included) reacts to the change.
 *
 * Must be called in an injection context (field initializer / constructor).
 */
export function injectLogicalToday(): Signal<string> {
  const doc = inject(DOCUMENT);
  const destroyRef = inject(DestroyRef);

  const today = signal(logicalToday());
  const onVisible = () => {
    if (doc.visibilityState === 'visible') today.set(logicalToday());
  };
  doc.addEventListener('visibilitychange', onVisible);
  destroyRef.onDestroy(() => doc.removeEventListener('visibilitychange', onVisible));

  return today.asReadonly();
}
