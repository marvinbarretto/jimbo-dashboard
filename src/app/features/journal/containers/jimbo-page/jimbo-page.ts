import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { formatPageTitle } from '@app/app-title-strategy';
import { map } from 'rxjs';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import {
  dayWindowIso,
  isDayKey,
  isMonthKey,
  isWeekKey,
  monthRange,
  weekStartFromKey,
} from '@shared/utils/date-keys';
import { FleetService } from '@features/fleet/data-access/fleet.service';
import { JournalAgentsSection } from '../../components/journal-agents-section/journal-agents-section';
import { JournalBriefingsSection } from '../../components/journal-briefings-section/journal-briefings-section';
import { JournalFleetHealth } from '../../components/journal-fleet-health/journal-fleet-health';
import { JournalMcpSection } from '../../components/journal-mcp-section/journal-mcp-section';
import { JournalPeriodHeader } from '../../components/journal-period-header/journal-period-header';
import { JournalDayStreamService } from '../../data-access/journal-day-stream.service';
import { type JournalGranularity, currentKeyFor, granularitiesFor } from '../../utils/period-links';

/**
 * The Jimbo domain: fleet health, then briefings, Hermes cron ticks and MCP
 * traffic. The three period sections take an exact [since, until) window, so
 * day/week/month are the same components over wider windows.
 *
 * Health sits above them and ignores the pager. Everything below is a record of
 * what already happened; the panel answers whether anything is happening now,
 * which is the question no retrospective section can reach — the fleet fails by
 * going silent, and silence is indistinguishable from a quiet day unless
 * something states what it expected.
 *
 * The service injections live here rather than in the panel because a container
 * is the sanctioned seam to data-access (VAULT-COMMANDS-001), and FleetService
 * carries dismiss mutations that must not be reachable from a presentational
 * component.
 */
@Component({
  selector: 'app-journal-jimbo-page',
  imports: [
    UiPage,
    UiStack,
    JournalAgentsSection,
    JournalBriefingsSection,
    JournalFleetHealth,
    JournalMcpSection,
    JournalPeriodHeader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-page width="wide">
    <app-journal-period-header
      domain="jimbo"
      [granularities]="granularities"
      [granularity]="granularity()"
      [key]="key()"
    />

    <app-ui-stack gap="lg">
      <!-- Above the period sections and outside the pager on purpose: "is Boris
           alive" is not a property of the day being viewed. -->
      <app-journal-fleet-health
        [workers]="fleet.workers()"
        [queue]="fleet.queue()"
        [running]="fleet.now()"
        [signals]="signals()" />

      <app-journal-briefings-section [since]="since()" [until]="until()" />
      <app-journal-agents-section [since]="since()" [until]="until()" />
      <app-journal-mcp-section [since]="since()" [until]="until()" />
    </app-ui-stack>
    </app-ui-page>
  `,
})
export class JournalJimboPage {
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);
  // Already polling every 30s and started by the app shell; this page is one
  // more reader of that same feed.
  protected readonly fleet = inject(FleetService);
  private readonly dayStream = inject(JournalDayStreamService);

  /** Collector health — the other half of "is the machinery working". */
  protected readonly signals = computed(() => this.dayStream.stream()?.signals ?? []);

  protected readonly granularities = granularitiesFor('jimbo');

  protected readonly granularity = toSignal(
    this.route.data.pipe(map(d => (d['granularity'] ?? 'day') as JournalGranularity)),
    { initialValue: 'day' as JournalGranularity },
  );

  protected readonly key = toSignal(
    this.route.paramMap.pipe(map(p => p.get('date') ?? p.get('week') ?? p.get('month') ?? '')),
    { initialValue: '' },
  );

  private readonly safeKey = computed(() => {
    const g = this.granularity();
    const k = this.key();
    const ok = g === 'day' ? isDayKey(k) : g === 'week' ? isWeekKey(k) : isMonthKey(k);
    return ok ? k : currentKeyFor(g);
  });

  private readonly window = computed(() => {
    const g = this.granularity();
    const key = this.safeKey();
    if (g === 'day') return dayWindowIso(key);
    if (g === 'week') {
      const start = weekStartFromKey(key);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return { since: start.toISOString(), until: end.toISOString() };
    }
    const { start, end } = monthRange(key);
    const dayAfterEnd = new Date(end);
    dayAfterEnd.setDate(end.getDate() + 1);
    return { since: start.toISOString(), until: dayAfterEnd.toISOString() };
  });

  protected readonly since = computed(() => this.window().since);
  protected readonly until = computed(() => this.window().until);

  constructor() {
    effect(() => this.titleService.setTitle(formatPageTitle(`Jimbo — ${this.safeKey()}`)));
    effect(() => {
      // Signals are registry-wide rather than day-scoped, but the endpoint is
      // day-keyed; the viewed day is the natural window to ask about.
      if (this.granularity() === 'day') void this.dayStream.load(this.safeKey());
    });
  }
}
