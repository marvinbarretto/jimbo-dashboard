import { type Signal, signal } from '@angular/core';
import { logicalToday } from '@shared/utils/datetime.utils';
import { pollWhileVisible } from '@features/journal/utils/live-poll';

/**
 * The logical day (04:00 Europe/London cutover) as a signal that survives the
 * phone shell's lifetime.
 *
 * /m components live in a persistent Capacitor WebView that gets backgrounded
 * and resumed across days — a day key captured at construction goes stale and
 * makes "Today" lie. Checked on a visibility-gated minute tick (which also
 * fires on resume), so a screen kept awake across the 04:00 cutover rolls
 * over too; anything derived (httpResource URLs included) reacts to the
 * change. Signal only updates on an actual day change, so the tick itself
 * never invalidates downstream computeds.
 *
 * Must be called in an injection context (field initializer / constructor).
 */
export function injectLogicalToday(): Signal<string> {
  const today = signal(logicalToday());
  pollWhileVisible(() => {
    const now = logicalToday();
    if (now !== today()) today.set(now);
  });
  return today.asReadonly();
}
