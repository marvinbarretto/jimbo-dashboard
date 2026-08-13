import { type Signal, signal } from '@angular/core';
import { pollWhileVisible } from '@features/journal/utils/live-poll';

/**
 * Wall-clock now, to the minute, as a signal that survives the phone shell's
 * lifetime.
 *
 * The home screen's daypart decides which NOW card shows and how the quick-log
 * grid is ranked. Tab reuse means the container is detached rather than
 * destroyed on a tab switch, so `ngOnInit` never runs again and a `now` captured
 * at construction freezes: a tab parked at 09:00 would still be offering
 * breakfast at 21:00. Visibility-gated, so it also re-reads on resume.
 *
 * Only sets when the minute actually changes, so downstream computeds
 * recompute at most once a minute rather than on every tick.
 *
 * Must be called in an injection context (field initializer / constructor).
 */
export function injectMinuteClock(): Signal<Date> {
  const now = signal(new Date());
  const minuteKey = (d: Date): number => Math.floor(d.getTime() / 60_000);

  pollWhileVisible(() => {
    const next = new Date();
    if (minuteKey(next) !== minuteKey(now())) now.set(next);
  }, 30_000);

  return now.asReadonly();
}
