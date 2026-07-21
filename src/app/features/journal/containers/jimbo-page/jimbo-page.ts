import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { formatPageTitle } from '@app/app-title-strategy';
import { map } from 'rxjs';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import {
  dayWindowIso,
  isDayKey,
  isMonthKey,
  isWeekKey,
  monthRange,
  weekStartFromKey,
} from '@shared/utils/date-keys';
import { JournalAgentsSection } from '../../components/journal-agents-section/journal-agents-section';
import { JournalBriefingsSection } from '../../components/journal-briefings-section/journal-briefings-section';
import { JournalMcpSection } from '../../components/journal-mcp-section/journal-mcp-section';
import { JournalPeriodHeader } from '../../components/journal-period-header/journal-period-header';
import { type JournalGranularity, currentKeyFor } from '../../utils/period-links';

/**
 * The Jimbo domain: briefings, Hermes cron ticks and MCP traffic. All three
 * sections take an exact [since, until) window, so day/week/month are the
 * same components over wider windows.
 */
@Component({
  selector: 'app-journal-jimbo-page',
  imports: [
    UiStack,
    JournalAgentsSection,
    JournalBriefingsSection,
    JournalMcpSection,
    JournalPeriodHeader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-journal-period-header
      domain="jimbo"
      [granularity]="granularity()"
      [key]="key()"
    />

    <app-ui-stack gap="lg">
      <app-journal-briefings-section [since]="since()" [until]="until()" />
      <app-journal-agents-section [since]="since()" [until]="until()" />
      <app-journal-mcp-section [since]="since()" [until]="until()" />
    </app-ui-stack>
  `,
})
export class JournalJimboPage {
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);

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
  }
}
