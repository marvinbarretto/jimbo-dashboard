import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import { formatMinutes } from '@shared/utils/datetime.utils';
import type { TelemetryEventLite } from '../../data-access/journal-data.service';
import { dedupeWindowedSum } from '../../utils/windowed-telemetry';

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => `${h.toString().padStart(2, '0')}:00`);

/**
 * Phone hardware/attention rollup for one day's telemetry: screen time,
 * unlocks, notifications, battery, media, app usage. Pure over the `events`
 * input — the owning page supplies the day bundle's telemetry.
 */
@Component({
  selector: 'app-journal-phone-section',
  imports: [UiBarChart, UiEmptyState, UiSection, UiStack, UiStatCard, UiSubhead, UiSubsection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-phone-section.html',
  styleUrl: '../../journal-sections.scss',
})
export class JournalPhoneSection {
  readonly events = input.required<readonly TelemetryEventLite[]>();

  protected readonly Math = Math;
  protected readonly formatMinutes = formatMinutes;
  protected readonly hourLabels = HOUR_LABELS;

  protected readonly open = linkedSignal(() => this.events().length > 0);

  protected readonly summary = computed(() => {
    const events = this.events();

    // Screen & usage — UsageCollector emits every ~30min, each event covering
    // a rolling 2-hour window. Raw sums over-count ~4×; dedupe to a
    // non-overlapping cover instead.
    const screenSessions = events.filter(e => e.collector === 'usage' && e.type === 'screen_session');
    const screenOnMinutes = Math.round(dedupeWindowedSum(screenSessions, e => e.value ?? 0) / 60);
    const unlocks = Math.round(
      dedupeWindowedSum(screenSessions, e => (e.payload?.['unlock_count'] as number) ?? 0),
    );
    const appUsage = ((events.find(e => e.collector === 'usage' && e.type === 'app_usage_daily')
      ?.payload?.['top_apps']) as Array<{ label: string; foreground_seconds: number }> | undefined) ?? [];

    // Notifications — group by short package name and bucket by hour
    const posted = events.filter(e => e.collector === 'notifications' && e.type === 'notifications.posted');
    const notifsByHour = new Array<number>(24).fill(0);
    const appMap = new Map<string, number>();
    for (const e of posted) {
      notifsByHour[new Date(e.ts).getHours()]++;
      const name = shortPkg(e.payload?.['pkg'] as string ?? '');
      appMap.set(name, (appMap.get(name) ?? 0) + 1);
    }
    const notifsByApp = [...appMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    // Battery — min/max/end from battery_level events, charge session count
    const batteryEvents = events.filter(e => e.collector === 'device' && e.type === 'battery_level');
    const levels = batteryEvents.map(e => Math.round(e.value ?? 0)).filter(v => v > 0);
    const chargeSessions = events.filter(
      e => e.collector === 'device' && e.type === 'charge_state_changed' && e.payload?.['plugged_in'] === true
    ).length;

    // Network — count kind transitions (wifi↔cellular = leaving/arriving at a known location)
    const netEvents = events
      .filter(e => e.collector === 'device' && e.type === 'network_state')
      .sort((a, b) => a.ts.localeCompare(b.ts));
    const networkSwitches = netEvents.filter(
      (e, i) => i > 0 && e.payload?.['kind'] !== netEvents[i - 1]?.payload?.['kind']
    ).length;

    const mediaSessions = events
      .filter(e => e.collector === 'media' && e.type === 'media.session_started')
      .map(e => ({
        app: shortPkg(e.payload?.['pkg'] as string ?? ''),
        title: e.payload?.['title'] as string | null ?? null,
        artist: e.payload?.['artist'] as string | null ?? null,
        ts: e.ts,
      }));

    return {
      screenOnMinutes, unlocks, appUsage,
      notifCount: posted.length, notifsByHour, notifsByApp,
      batteryMin: levels.length ? Math.min(...levels) : null,
      batteryMax: levels.length ? Math.max(...levels) : null,
      batteryEnd: levels.length ? levels[levels.length - 1] : null,
      chargeSessions, networkSwitches, mediaSessions,
      locationPoints: events.filter(e => e.collector === 'location').length,
    };
  });

  protected readonly notifsByHour = computed(() => this.summary().notifsByHour);
}

function shortPkg(pkg: string): string {
  return pkg.split('.').at(-1) ?? pkg;
}
