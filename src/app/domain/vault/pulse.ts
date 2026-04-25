// Inverse of staleness: pulseIntensity is high for *recent* activity and decays
// to 0 as time passes. Drives a small pulsing dot on cards so the operator can
// see at a glance "what just happened" without expanding anything.
//
// Where staleness saturates at OLD (60 days), pulse saturates at NEW (just-now)
// and fades out over a 24-hour window. The two signals are complementary — a
// card can be stale (border red) AND pulsing (something just changed on it).

export const PULSE_WINDOW_MINUTES = 24 * 60; // 24 hours

// Returns a 0..1 ratio: 1 = activity right now, 0 = older than the window.
// Null timestamp returns 0 (no activity recorded means no pulse).
//
// Linear decay — the CSS animation already provides "feel" via the rhythm; we
// don't need an ease curve in the data layer too.
export function pulseIntensity(
  lastActivityIso: string | null,
  nowIso: string = new Date().toISOString(),
  windowMinutes: number = PULSE_WINDOW_MINUTES,
): number {
  if (!lastActivityIso) return 0;
  const ms = new Date(nowIso).getTime() - new Date(lastActivityIso).getTime();
  if (ms < 0) return 1; // future timestamp — clock skew, treat as just-now
  const minutes = ms / (1000 * 60);
  if (minutes >= windowMinutes) return 0;
  return 1 - minutes / windowMinutes;
}
