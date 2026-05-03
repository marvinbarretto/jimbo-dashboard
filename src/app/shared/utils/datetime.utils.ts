/**
 * Formats an ISO timestamp as a readable datetime string.
 * Omits the year when it matches the current year.
 *
 * @param value - ISO 8601 timestamp string, or null/undefined
 * @returns e.g. "2 May 14:18:00" or "2 May 2024 14:18:00"; "—" for null/empty/invalid input
 */
export function formatDatetime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const day = d.getDate();
  const month = d.toLocaleString('en-GB', { month: 'short' });
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const time = `${hh}:${mm}:${ss}`;
  if (d.getFullYear() !== new Date().getFullYear()) {
    return `${day} ${month} ${d.getFullYear()} ${time}`;
  }
  return `${day} ${month} ${time}`;
}

/**
 * Formats an ISO timestamp relative to now.
 * Handles both past and future dates.
 *
 * @param iso - ISO 8601 timestamp string, or null/undefined
 * @returns e.g. "5m ago", "in 2h", "just now"; "never" for null/empty input
 */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;
  if (abs < 60_000) return future ? 'in <1m' : 'just now';
  if (abs < 3_600_000) {
    const mins = Math.round(abs / 60_000);
    return future ? `in ${mins}m` : `${mins}m ago`;
  }
  if (abs < 86_400_000) {
    const hrs = Math.round(abs / 3_600_000);
    return future ? `in ${hrs}h` : `${hrs}h ago`;
  }
  const days = Math.round(abs / 86_400_000);
  return future ? `in ${days}d` : `${days}d ago`;
}

/**
 * Formats an ISO timestamp as a context-aware absolute time.
 * Shows only the time for today's dates; prepends the date otherwise.
 *
 * @param iso - ISO 8601 timestamp string, or null
 * @returns e.g. "14:18" for today, "2 May 14:18" for other dates; "" for null
 */
export function absoluteTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return time;
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + time;
}

/**
 * Formats a Date object as a locale time string.
 *
 * @param date - The Date to format
 * @returns e.g. "14:18"
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formats the time remaining from a reference date to an ISO target timestamp.
 *
 * @param iso - ISO 8601 target timestamp, or null
 * @param now - The reference Date to count down from
 * @returns e.g. "2m 30s", "45s", "1h 5m", "overdue"; "—" for null
 */
export function formatCountdown(iso: string | null, now: Date): string {
  if (!iso) return '—';
  const secs = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  if (secs < 0) return 'overdue';
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  if (mins < 60) return `${mins}m ${remSecs}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

/**
 * Calculates what percentage of the calendar day has elapsed for a given Date.
 *
 * @param date - The Date to evaluate
 * @returns A value between 0 and 100
 */
export function dayPercent(date: Date): number {
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);
  return ((date.getTime() - midnight.getTime()) / 86_400_000) * 100;
}

/**
 * Formats a duration in seconds as a human-readable approximate string.
 *
 * @param seconds - Duration in seconds, or null
 * @returns e.g. "~45s", "~3m", "~2h"; "—" for null
 */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `~${seconds}s`;
  if (seconds < 3600) return `~${Math.round(seconds / 60)}m`;
  return `~${Math.round(seconds / 3600)}h`;
}

/**
 * Formats a byte count as a human-readable file size string.
 *
 * @param bytes - Size in bytes
 * @returns e.g. "512 B", "24 KB", "1.4 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
