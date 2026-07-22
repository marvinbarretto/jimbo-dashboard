// The briefing calendar board's column layout — THE file to tweak.
//
// Each column is one lane on the board and merges events from every source
// listed under it. To add/remove/rename a calendar, edit this array — the
// component renders whatever is here, in order. Calendar IDs aren't secrets
// (Marvin's own calendars; same convention as the planner's hardcoded
// suggestions ID). `account` picks whose OAuth credentials the API uses.

export interface BoardCalendarSource {
  /** 'primary' or a full Google calendar id. */
  calendarId: string;
  /** Which configured Google account reads it. */
  account: 'marvin' | 'jimbo';
}

export interface BoardColumnConfig {
  key: string;
  label: string;
  /** Hatched "negotiable" styling + the briefing's suggested_blocks render here. */
  pencilled?: boolean;
  sources: BoardCalendarSource[];
}

export const CALENDAR_BOARD_COLUMNS: BoardColumnConfig[] = [
  {
    key: 'schedule',
    label: 'My schedule',
    // "Where I'll be" — primary plus the group calendars real plans live on.
    sources: [
      { calendarId: 'primary', account: 'marvin' },
      // Travel
      { calendarId: '2opuqn8a8pbs30hc34oaot7ttg@group.calendar.google.com', account: 'marvin' },
      // Reminders
      { calendarId: '1mcqo92cnc2upob3932019ji90@group.calendar.google.com', account: 'marvin' },
    ],
  },
  {
    key: 'jimbo',
    label: 'Jimbo',
    // The jimbo account's own calendar (marvinbarretto.labs@gmail.com).
    sources: [{ calendarId: 'primary', account: 'jimbo' }],
  },
  {
    key: 'suggestions',
    label: 'Suggestions',
    pencilled: true,
    sources: [
      { calendarId: '2244d4f6d61cbc9f2041405c16dea6726a34f2c895e49dce7c5e1e4f0287789c@group.calendar.google.com', account: 'marvin' },
    ],
  },
];
