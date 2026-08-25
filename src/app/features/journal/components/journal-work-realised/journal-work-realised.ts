import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import type { Moment } from '@domain/day-stream/day-stream';
import { JournalDayStreamService } from '../../data-access/journal-day-stream.service';

/** Beyond this the section stops being a summary and becomes a feed. */
const MAX_BULLETS = 6;

interface Bullet {
  readonly id: string;
  readonly ts: string;
  readonly time: string;
  readonly chip: string;
  readonly title: string;
  readonly detail: string | null;
  readonly tag: string;
}

/**
 * What today actually produced, as outcomes rather than activity.
 *
 * The rule that keeps it outcomes: **one line per thing that changed state.**
 * A batch of commits on one repo is one line, not thirteen; a vault item
 * reaching done is one line. Code sessions are excluded outright — a session
 * is time spent, which the rail already counts and the Work tab already lists.
 *
 * Explicitly not the day stream, which is chronological and complete. This is
 * selective and capped: a section that can grow without limit is a feed, and a
 * feed is the thing this page was rebuilt to stop being.
 */
@Component({
  selector: 'app-journal-work-realised',
  imports: [RouterLink, UiEmptyState, UiSubhead],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="realised">
      <app-ui-subhead label="Work realised" [meta]="meta()" />

      @if (bullets().length === 0) {
        <app-ui-empty-state message="Nothing has landed yet today." />
      } @else {
        <ul class="realised__list">
          @for (b of bullets(); track b.id) {
            <li class="realised__item">
              <span class="realised__time">{{ b.time }}</span>
              <span class="realised__chip">{{ b.chip }}</span>
              <span class="realised__body">
                <span class="realised__title">{{ b.title }}</span>
                @if (b.detail; as d) {
                  <span class="realised__detail">{{ d }}</span>
                }
              </span>
              <span class="realised__tag">{{ b.tag }}</span>
            </li>
          }
        </ul>

        @if (overflow() > 0) {
          <a class="realised__more" [routerLink]="['/journal', 'work', 'day', date()]">
            {{ overflow() }} more in Work →
          </a>
        }
      }
    </section>
  `,
  styles: [`
    .realised__list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .realised__item {
      display: grid;
      grid-template-columns: 3.2rem auto 1fr auto;
      align-items: baseline;
      gap: 0.6rem;
      padding: 0.4rem 0;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.8rem;
    }

    .realised__item:last-child { border-bottom: 0; }

    .realised__time {
      font-size: 0.68rem;
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
    }

    .realised__chip {
      font-size: 0.66rem;
      padding: 0.05rem 0.4rem;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      color: var(--color-text-muted);
      white-space: nowrap;
    }

    // Title and detail share a cell so a long commit subject wraps under
    // itself rather than pushing the tag column around.
    .realised__body { min-width: 0; }

    .realised__title {
      color: var(--color-text);
      overflow-wrap: anywhere;
    }

    .realised__detail {
      display: block;
      font-size: 0.7rem;
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
    }

    .realised__tag {
      font-size: 0.66rem;
      color: var(--color-text-soft);
      white-space: nowrap;
    }

    .realised__more {
      display: inline-block;
      margin-top: 0.6rem;
      font-size: 0.72rem;
      color: var(--color-text-muted);
      text-decoration: none;
    }

    .realised__more:hover { color: var(--color-text); }
  `],
})
export class JournalWorkRealised {
  readonly date = input.required<string>();

  private readonly service = inject(JournalDayStreamService);

  // The page owns loading; the support strip below reads the same payload.
  private readonly moments = computed<readonly Moment[]>(() =>
    this.service.stream()?.moments ?? []);

  /** Every outcome, newest first — before the display cap is applied. */
  private readonly all = computed<Bullet[]>(() => {
    const moments = this.moments();
    const bullets: Bullet[] = [];

    // Vault movements are outcomes by definition: an item only changes state
    // because a decision was made about it.
    for (const m of moments.filter(m => m.category === 'vault')) {
      bullets.push({
        id: `vault-${m.ts}-${m.title}`,
        ts: m.ts,
        time: formatTime(m.ts),
        chip: 'vault',
        title: m.title,
        detail: m.detail,
        tag: m.kind.replace(/_/g, ' '),
      });
    }

    // Commits collapse per repo. Thirteen lines saying "a commit happened" is
    // the feed this section exists instead of; one line per repo, carrying the
    // most recent subject, says what moved.
    const byRepo = new Map<string, Moment[]>();
    for (const m of moments.filter(m => m.kind === 'commit')) {
      const repo = shortRepo(m.meta['repo']);
      byRepo.set(repo, [...(byRepo.get(repo) ?? []), m]);
    }

    for (const [repo, commits] of byRepo) {
      const sorted = [...commits].sort((a, b) => b.ts.localeCompare(a.ts));
      const latest = sorted[0];
      bullets.push({
        id: `commits-${repo}`,
        ts: latest.ts,
        time: formatTime(latest.ts),
        chip: repo,
        title: `${commits.length} ${commits.length === 1 ? 'commit' : 'commits'}`,
        detail: latest.title,
        tag: 'shipped',
      });
    }

    return bullets.sort((a, b) => b.ts.localeCompare(a.ts));
  });

  protected readonly bullets = computed(() => this.all().slice(0, MAX_BULLETS));
  protected readonly overflow = computed(() => Math.max(0, this.all().length - MAX_BULLETS));

  protected readonly meta = computed(() => {
    const total = this.all().length;
    if (total === 0) return null;
    return total > MAX_BULLETS ? `${MAX_BULLETS} of ${total}` : `${total}`;
  });
}

/** `marvinbarretto/jimbo-api` reads as `jimbo-api` — the owner is always the same. */
function shortRepo(repo: unknown): string {
  return typeof repo === 'string' && repo.length > 0
    ? (repo.split('/').at(-1) ?? repo)
    : 'unattributed';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
