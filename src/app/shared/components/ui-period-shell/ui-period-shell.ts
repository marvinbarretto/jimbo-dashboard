import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { UiTabBar } from '@shared/components/ui-tab-bar/ui-tab-bar';
import {
  type DayKey,
  type MonthKey,
  type WeekKey,
  dateFromDayKey,
  dayKeyFromDate,
  isDayKey,
  isMonthKey,
  isWeekKey,
  monthKeyFromDate,
  monthRange,
  thisMonthKey,
  thisWeekKey,
  todayKey,
  weekKeyFromDate,
  weekStartFromKey,
} from '@shared/utils/date-keys';

interface PeerLinks {
  readonly day: DayKey;
  readonly week: WeekKey;
  readonly month: MonthKey;
}

/**
 * Day/Week/Month sub-nav for a period-scoped feature (journal, exercise,
 * nutrition, …): a tab bar over `/<basePath>/day|week|month/:key` routes plus
 * the router-outlet for whichever period page is active. Watches the URL to
 * build "peer" links that preserve the current point-in-time when switching
 * granularity (viewing March → Week tab lands on the week containing March,
 * not today).
 *
 * Each feature mounts this behind a tiny wrapper component (so route configs
 * stay simple `loadComponent` imports) with its own `basePath`.
 */
@Component({
  selector: 'app-ui-period-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UiTabBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-tab-bar [label]="label() + ' scope'" class="period-shell__tabs">
      <a class="period-shell__tab"
         [routerLink]="['/' + basePath(), 'day', peers().day]"
         routerLinkActive="active">Day</a>
      <a class="period-shell__tab"
         [routerLink]="['/' + basePath(), 'week', peers().week]"
         routerLinkActive="active">Week</a>
      <a class="period-shell__tab"
         [routerLink]="['/' + basePath(), 'month', peers().month]"
         routerLinkActive="active">Month</a>
    </app-ui-tab-bar>

    <div class="period-shell__body">
      <router-outlet />
    </div>
  `,
  styles: [`
    .period-shell__tab {
      padding: 0.7rem 1rem;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--color-text-muted);
      text-decoration: none;
      border-bottom: 2px solid transparent;
    }

    .period-shell__tab:hover {
      color: var(--color-text);
    }

    .period-shell__tab.active {
      color: var(--section-accent, var(--color-accent));
      border-bottom-color: var(--section-accent, var(--color-accent));
    }

    .period-shell__body {
      padding-block: 1rem 2rem;
    }
  `],
})
export class UiPeriodShell {
  private readonly router = inject(Router);

  /** URL segment the feature is mounted at, e.g. `'exercise'`. */
  readonly basePath = input.required<string>();
  /** Human label for the tab bar's aria-label, e.g. `'Exercise'`. */
  readonly label = input<string>('Navigation');

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly peers = computed<PeerLinks>(() => derivePeers(this.url(), this.basePath()));
}

function derivePeers(url: string, basePath: string): PeerLinks {
  const segments = (url.split('?')[0] ?? '').split('/').filter(Boolean);
  const baseIdx = segments.indexOf(basePath);
  if (baseIdx === -1) return defaultPeers();

  const granularity = segments[baseIdx + 1];
  const key = segments[baseIdx + 2];

  if (granularity === 'day' && isDayKey(key)) return peersFromDate(dateFromDayKey(key));
  if (granularity === 'week' && isWeekKey(key)) return peersFromDate(weekStartFromKey(key));
  if (granularity === 'month' && isMonthKey(key)) return peersFromDate(monthRange(key).start);

  return defaultPeers();
}

function peersFromDate(d: Date): PeerLinks {
  return {
    day: dayKeyFromDate(d),
    week: weekKeyFromDate(d),
    month: monthKeyFromDate(d),
  };
}

function defaultPeers(): PeerLinks {
  return { day: todayKey(), week: thisWeekKey(), month: thisMonthKey() };
}
