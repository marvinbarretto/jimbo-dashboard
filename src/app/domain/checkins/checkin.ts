// A mood/energy check-in — captured from a Telegram nudge, a pomodoro
// completion, or manual/dashboard entry. Cross-feature: pomo needs this
// shape to log its own capture point, the checkins feature owns the trend
// view over it.
export type CheckInSource = 'telegram_nudge' | 'pomo_complete' | 'manual' | 'dashboard';
export type CheckInState = 'pending' | 'answered' | 'dismissed' | 'expired';

export interface MoodLogEntry {
  id:          string;
  source:      CheckInSource;
  state:       CheckInState;
  mood:        number | null;
  energy:      number | null;
  sent_at:     string;
  answered_at: string | null;
  context:     Record<string, unknown>;
  notes:       string | null;
}

export interface CheckInCreatePayload {
  source:   Exclude<CheckInSource, 'telegram_nudge'>;
  mood:     number;
  energy:   number;
  context?: Record<string, unknown>;
  notes?:   string;
}

export interface MoodDailyRow {
  date:       string;
  avg_mood:   number;
  avg_energy: number;
  count:      number;
}

// Word anchors, not bare numbers — matches jimbo-api's mood-log.ts labels
// exactly (index 0 = score 1). Mood genuinely spans 5 states; energy only
// ever reads as three (none/some/lots), so the scales are deliberately
// different widths.
export const MOOD_LABELS = ['Rough', 'Off', 'OK', 'Good', 'Great'] as const;
export const ENERGY_LABELS = ['None', 'Some', 'Lots'] as const;
