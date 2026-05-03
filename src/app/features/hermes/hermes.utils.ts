import type { HermesJob } from './hermes.types';
export { absoluteTime, dayPercent, formatBytes, formatCountdown, formatDuration, formatTime, relativeTime } from '@shared/utils/datetime.utils';

/**
 * Maps a job's runtime state and last run status to a badge tone for visual triage.
 *
 * @param state - Current job state (e.g. "running", "paused", "scheduled")
 * @param lastStatus - Result of the last run (e.g. "ok", "error"), or null
 * @returns Badge tone string suitable for `<app-ui-badge [tone]>`
 */
export function stateBadgeTone(state: string, lastStatus: string | null): string {
  if (state === 'running') return 'accent';
  if (state === 'paused') return 'warning';
  if (lastStatus && lastStatus !== 'ok' && lastStatus !== 'success') return 'danger';
  if (state === 'scheduled') return 'success';
  return 'neutral';
}

/**
 * Normalises a raw deliver string to a short display label.
 *
 * @param deliver - Raw deliver value from the job config, or null
 * @returns e.g. "telegram", "discord", "slack", or "local" for null/unrecognised values
 */
export function deliverLabel(deliver: string | null): string {
  if (!deliver) return 'local';
  if (deliver.startsWith('telegram')) return 'telegram';
  if (deliver.startsWith('discord')) return 'discord';
  if (deliver.startsWith('slack')) return 'slack';
  return deliver;
}

/**
 * Extracts the repeat interval in minutes from a schedule display string.
 *
 * @param scheduleDisplay - Human-readable schedule string, e.g. "every 15m"
 * @returns Interval in minutes, or null if the format is unrecognised
 */
export function extractIntervalMinutes(scheduleDisplay: string | null): number | null {
  if (!scheduleDisplay) return null;
  const match = scheduleDisplay.match(/every (\d+)m/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Returns all fire times for a job within the current calendar day,
 * reconstructed by walking backwards from `next_run_at` using the schedule interval.
 *
 * @param job - The HermesJob to compute fire times for
 * @returns Array of Date objects representing each scheduled fire within today
 */
export function todayFireTimes(job: HermesJob): Date[] {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  if (!job.next_run_at) return [];

  const nextFire = new Date(job.next_run_at);
  const intervalMins = extractIntervalMinutes(job.schedule_display);

  if (!intervalMins || intervalMins >= 720) {
    if (nextFire >= todayStart && nextFire < todayEnd) return [nextFire];
    if (job.last_run_at) {
      const last = new Date(job.last_run_at);
      if (last >= todayStart && last < todayEnd) return [last];
    }
    return [];
  }

  const intervalMs = intervalMins * 60_000;
  let t = nextFire.getTime();
  while (t - intervalMs >= todayStart.getTime()) t -= intervalMs;

  const times: Date[] = [];
  while (t < todayEnd.getTime()) {
    if (t >= todayStart.getTime()) times.push(new Date(t));
    t += intervalMs;
  }
  return times;
}
