import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

interface GateBlocker {
  seq: number | null;
  note_id: string;
  title: string | null;
  since: string;
}

interface Gate {
  id: string;
  label: string;
  current: number;
  threshold: number;
  blocked: boolean;
  reason: string | null;
  last_moved_at: string | null;
  blockers: GateBlocker[];
  detail: string;
}

const DAY_MS = 86_400_000;

/**
 * What is stopping work moving, and what specifically is holding it.
 *
 * The board already answers "what is waiting on me". It never answered "why is
 * nothing moving" — and on 2026-08-22 that gap cost 16 days: the notification
 * gate had been shut since 2026-08-06 (three unresolved pushes against a cap of
 * three, two of them duplicate car-hire housekeeping) and ~1,101 handbacks
 * arrived with no ping at all. Every surface showed the queue growing. None
 * showed the valve.
 *
 * So a count alone is not the deliverable. "3/3" is not actionable; "#4230 and
 * #4232 have held this since Aug 6" is. Gates that can name their blockers do.
 */
@Component({
  selector: 'app-gates-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (gates().length) {
      <div class="gates" role="group" aria-label="Pipeline gates">
        @for (g of gates(); track g.id) {
          <article class="gate" [class.gate--blocked]="g.blocked">
            <header class="gate__head">
              <span class="gate__label">{{ g.label }}</span>
              <span class="gate__state" [class.gate__state--blocked]="g.blocked">
                {{ g.blocked ? 'BLOCKED' : 'flowing' }}
              </span>
            </header>

            <p class="gate__count">
              <strong>{{ g.current }}</strong>
              @if (g.threshold > 0) {
                <span class="gate__of"> / {{ g.threshold }}</span>
              }
            </p>

            <!-- A bar that can exceed 100% on purpose: grooming sits at 26x its
                 threshold, and clamping it to "full" would read as merely full. -->
            <!-- Gates with threshold 0 are disclosures, not budgets (the deferred
                 pile). A bar would imply some number of parked items is the target. -->
            @if (g.threshold > 0) {
              <div class="gate__bar" [attr.aria-label]="g.current + ' of ' + g.threshold">
                <div class="gate__fill" [class.gate__fill--over]="g.current > g.threshold"
                     [style.width.%]="fillPct(g)"></div>
              </div>
            }

            <p class="gate__detail">{{ g.detail }}</p>

            @if (g.blockers.length) {
              <ul class="gate__blockers">
                @for (b of g.blockers; track b.note_id) {
                  <li>
                    <span class="gate__seq">#{{ b.seq ?? '?' }}</span>
                    <span class="gate__title">{{ b.title ?? b.note_id }}</span>
                    <span class="gate__age">{{ age(b.since) }}</span>
                  </li>
                }
              </ul>
            }

            @if (g.last_moved_at) {
              <p class="gate__moved">last moved {{ age(g.last_moved_at) }} ago</p>
            }
          </article>
        }
      </div>
    }
  `,
  styles: [`
    .gates {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .gate {
      border: 1px solid var(--border, #333);
      border-radius: 6px;
      padding: 0.75rem;
      background: var(--surface, #16181d);
    }
    .gate--blocked { border-color: var(--danger, #d9534f); }
    .gate__head { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; }
    .gate__label { font-weight: 600; font-size: 0.85rem; }
    .gate__state {
      font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.06em;
      color: var(--muted, #8b929e);
    }
    .gate__state--blocked { color: var(--danger, #d9534f); font-weight: 700; }
    .gate__count { margin: 0.35rem 0 0.25rem; font-size: 1.5rem; line-height: 1; }
    .gate__of { font-size: 0.9rem; color: var(--muted, #8b929e); }
    .gate__bar {
      height: 4px; border-radius: 2px; overflow: hidden;
      background: var(--border, #333); margin-bottom: 0.5rem;
    }
    .gate__fill { height: 100%; background: var(--ok, #4a9); }
    .gate__fill--over { background: var(--danger, #d9534f); }
    .gate__detail { margin: 0; font-size: 0.75rem; color: var(--muted, #8b929e); }
    .gate__blockers { list-style: none; margin: 0.5rem 0 0; padding: 0; font-size: 0.72rem; }
    .gate__blockers li {
      display: flex; gap: 0.4rem; align-items: baseline;
      padding: 0.15rem 0; border-top: 1px solid var(--border, #2a2d34);
    }
    .gate__seq { color: var(--muted, #8b929e); flex: none; }
    .gate__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .gate__age { margin-left: auto; flex: none; color: var(--muted, #8b929e); }
    .gate__moved { margin: 0.4rem 0 0; font-size: 0.68rem; color: var(--muted, #8b929e); }
  `],
})
export class GatesStrip {
  private readonly res = httpResource<{ items: Gate[] }>(
    () => `${environment.dashboardApiUrl}/api/gates`,
  );

  protected readonly gates = computed(() => this.res.value()?.items ?? []);

  /** Caps the *bar* at 100% while the number above it still tells the truth. */
  protected fillPct(g: Gate): number {
    if (g.threshold <= 0) return 0;
    return Math.min(100, (g.current / g.threshold) * 100);
  }

  protected age(iso: string): string {
    const days = (Date.now() - Date.parse(iso)) / DAY_MS;
    if (Number.isNaN(days)) return '';
    if (days >= 1) return `${Math.floor(days)}d`;
    const hours = days * 24;
    if (hours >= 1) return `${Math.floor(hours)}h`;
    return '<1h';
  }
}
