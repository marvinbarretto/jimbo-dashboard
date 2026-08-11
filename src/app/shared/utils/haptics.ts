import { DOCUMENT, inject } from '@angular/core';

/**
 * Vibration feedback for the phone shell, via the standard Vibration API.
 *
 * Degrades to a no-op everywhere it can't work: desktop browsers, iOS (which
 * never implemented navigator.vibrate), and a WebView whose host APK lacks
 * android.permission.VIBRATE. When jimbo-app grows a HapticsPlugin with real
 * amplitude control this becomes the web fallback behind a bridge check.
 *
 * Must be called in an injection context.
 */
export function injectHaptics(): { tap(): void; success(): void } {
  const nav = inject(DOCUMENT).defaultView?.navigator;
  const vibrate = (pattern: number | number[]): void => {
    try {
      nav?.vibrate?.(pattern);
    } catch {
      // Some WebViews throw instead of returning false without the permission.
    }
  };
  return {
    /** A short tick — set committed, rep counted. */
    tap: () => vibrate(15),
    /** A firmer double pulse — session finished. */
    success: () => vibrate([30, 60, 30]),
  };
}
