import type { HermesJob } from './hermes.types';

export function relativeTime(iso: string | null): string {
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

export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function stateBadgeTone(state: string, lastStatus: string | null): string {
  if (state === 'running') return 'accent';
  if (state === 'paused') return 'warning';
  if (lastStatus && lastStatus !== 'ok' && lastStatus !== 'success') return 'danger';
  if (state === 'scheduled') return 'success';
  return 'neutral';
}

export function deliverLabel(deliver: string | null): string {
  if (!deliver) return 'local';
  if (deliver.startsWith('telegram')) return 'telegram';
  if (deliver.startsWith('discord')) return 'discord';
  if (deliver.startsWith('slack')) return 'slack';
  return deliver;
}

export function extractIntervalMinutes(scheduleDisplay: string | null): number | null {
  if (!scheduleDisplay) return null;
  const match = scheduleDisplay.match(/every (\d+)m/);
  return match ? parseInt(match[1], 10) : null;
}

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

export function dayPercent(date: Date): number {
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);
  return ((date.getTime() - midnight.getTime()) / 86_400_000) * 100;
}
