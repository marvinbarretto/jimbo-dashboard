import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { UiTabBar } from '@shared/components/ui-tab-bar/ui-tab-bar';
import {
  type DayKey,
  type MonthKey,
  type WeekKey,
  dateFromDayKey,
  isDayKey,
  isMonthKey,
  isWeekKey,
  monthKeyFromDate,
  thisMonthKey,
  thisWeekKey,
  todayKey,
  weekKeyFromDate,
  weekStartFromKey,
  monthRange,
} from '../../utils/date-keys';

interface PeerLinks {
  readonly day: DayKey;
  readonly week: WeekKey;
  readonly month: MonthKey;
}

@Component({
  selector: 'app-journal-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UiTabBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-tab-bar label="Journal scope" class="journal-shell__tabs">
      <a class="journal-shell__tab"
         [routerLink]="['/journal/day', peers().day]"
         routerLinkActive="active">Day</a>
      <a class="journal-shell__tab"
         [routerLink]="['/journal/week', peers().week]"
         routerLinkActive="active">Week</a>
      <a class="journal-shell__tab"
         [routerLink]="['/journal/month', peers().month]"
         routerLinkActive="active">Month</a>
    </app-ui-tab-bar>

    <div class="journal-shell__body">
      <router-outlet />
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .journal-shell__tab {
      padding: 0.7rem 1rem;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--color-text-muted);
      text-decoration: none;
      border-bottom: 2px solid transparent;
    }

    .journal-shell__tab:hover {
      color: var(--color-text);
    }

    .journal-shell__tab.active {
      color: var(--section-accent, var(--color-accent));
      border-bottom-color: var(--section-accent, var(--color-accent));
    }

    .journal-shell__body {
      padding: 1rem 1.5rem 2rem;
    }
  `],
})
export class JournalShell {
  private readonly router = inject(Router);

  // Watch the URL so the sub-nav can build peer links that preserve the
  // user's current point-in-time when they switch granularity.
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly peers = computed<PeerLinks>(() => derivePeers(this.url()));
}

function derivePeers(url: string): PeerLinks {
  const segments = (url.split('?')[0] ?? '').split('/').filter(Boolean);
  const journalIdx = segments.indexOf('journal');
  if (journalIdx === -1) return defaultPeers();

  const granularity = segments[journalIdx + 1];
  const key = segments[journalIdx + 2];

  if (granularity === 'day' && isDayKey(key)) return peersFromDate(dateFromDayKey(key));
  if (granularity === 'week' && isWeekKey(key)) return peersFromDate(weekStartFromKey(key));
  if (granularity === 'month' && isMonthKey(key)) return peersFromDate(monthRange(key).start);

  return defaultPeers();
}

function peersFromDate(d: Date): PeerLinks {
  return {
    day: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    week: weekKeyFromDate(d),
    month: monthKeyFromDate(d),
  };
}

function defaultPeers(): PeerLinks {
  return { day: todayKey(), week: thisWeekKey(), month: thisMonthKey() };
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
