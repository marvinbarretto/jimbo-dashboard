import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { UiTabBar } from '@shared/components/ui-tab-bar/ui-tab-bar';
import { todayKey } from '@shared/utils/date-keys';
import { type JournalGranularity, currentKeyFor, peerKeys, resolveGranularity } from '../../utils/period-links';

const DOMAINS = [
  { key: 'overview', label: 'Overview' },
  { key: 'work', label: 'Work' },
  { key: 'body', label: 'Body' },
  { key: 'jimbo', label: 'Jimbo' },
  { key: 'phone', label: 'Phone' },
  { key: 'reflect', label: 'Reflect' },
] as const;

const GRANULARITIES: ReadonlySet<string> = new Set(['day', 'week', 'month']);

/**
 * Journal shell: sticky tab bar of data DOMAINS (Overview · Work · Body ·
 * Jimbo · Phone · Reflect). Switching domains preserves the current
 * point-in-time, narrowed to what the destination supports — Reflect is a
 * day construct, and most domains stop at a week. See `granularitiesFor`.
 *
 * Switching domains preserves the current point-in-time —
 * viewing Work's week → Body lands on Body's same week; domains that don't
 * support the current granularity fall back to its day peer.
 */
@Component({
  selector: 'app-journal-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, UiTabBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-tab-bar label="Journal domains">
      @for (d of domainLinks(); track d.key) {
        <a class="jshell__tab" [routerLink]="d.link" routerLinkActive="jshell__tab--active">
          {{ d.label }}
        </a>
      }
    </app-ui-tab-bar>
    <div class="jshell__body">
      <router-outlet />
    </div>
  `,
  styles: [`
    .jshell__tab {
      padding: 0.65rem 0.9rem;
      font-size: 0.82rem;
      color: var(--color-text-muted);
      text-decoration: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;

      &:hover { color: var(--color-text); }

      &--active {
        color: var(--color-text);
        border-bottom-color: var(--section-accent, var(--color-accent));
      }
    }

    .jshell__body {
      padding-top: 1rem;
    }
  `],
})
export class JournalShell {
  private readonly router = inject(Router);

  // Current /journal/<domain>/<granularity>/<key> — updates on navigation.
  private readonly urlParts = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      startWith(null),
      map(() => parseJournalUrl(this.router.url)),
    ),
    { initialValue: parseJournalUrl(this.router.url) },
  );

  protected readonly domainLinks = computed(() => {
    const parts = this.urlParts();
    const granularity = parts?.granularity ?? 'day';
    const key = parts?.key ?? todayKey();
    const peers = peerKeys(granularity, key);
    return DOMAINS.map(d => {
      // Domains declare their own horizons, so switching never lands on one
      // the destination will not offer a way back out of.
      const g = resolveGranularity(d.key, granularity);
      return { key: d.key, label: d.label, link: ['/journal', d.key, g, peers[g]] };
    });
  });
}

function parseJournalUrl(url: string): { granularity: JournalGranularity; key: string } | null {
  // /journal/<domain>/<gran>/<key>[?query]
  const segments = url.split('?')[0].split('/').filter(Boolean);
  const [root, , gran, key] = segments;
  if (root !== 'journal' || !gran || !GRANULARITIES.has(gran)) return null;
  const g = gran as JournalGranularity;
  return { granularity: g, key: key || currentKeyFor(g) };
}
