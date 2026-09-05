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

/** A gate with its ages and bar width resolved once, at fetch time. */
interface GateView extends Omit<Gate, 'blockers'> {
  fillPct: number;
  movedAge: string | null;
  blockers: readonly (GateBlocker & { age: string })[];
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
  styleUrl: './gates-strip.scss',
  template: `
    @if (gates().length) {
      <div class="gates" role="group" aria-label="Pipeline gates">
        @for (g of gates(); track g.id) {
          <article class="gate" [class.gate--blocked]="g.blocked" [class.gate--haslist]="g.blockers.length > 0">
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

            <!-- A bar that can exceed 100% on purpose: grooming sits many times
                 over its threshold, and clamping it to "full" would read as
                 merely full. -->
            <!-- Gates with threshold 0 are disclosures, not budgets (the deferred
                 pile). A bar would imply some number of parked items is the target. -->
            @if (g.threshold > 0) {
              <div class="gate__bar" [attr.aria-label]="g.current + ' of ' + g.threshold">
                <div class="gate__fill" [class.gate__fill--over]="g.current > g.threshold"
                     [style.width.%]="g.fillPct"></div>
              </div>
            }

            <p class="gate__detail">{{ g.detail }}</p>

            @if (g.blockers.length) {
              <ul class="gate__blockers">
                @for (b of g.blockers; track b.note_id) {
                  <li>
                    <span class="gate__seq">#{{ b.seq ?? '?' }}</span>
                    <span class="gate__title">{{ b.title ?? b.note_id }}</span>
                    <span class="gate__age">{{ b.age }}</span>
                  </li>
                }
              </ul>
            }

            @if (g.movedAge) {
              <p class="gate__moved">last moved {{ g.movedAge }} ago</p>
            }
          </article>
        }
      </div>
    }
  `,
})
export class GatesStrip {
  private readonly res = httpResource<{ items: Gate[] }>(
    () => `${environment.dashboardApiUrl}/api/gates`,
  );

  /**
   * Ages are stamped here rather than read per binding: gate ages are
   * hour-granular, so the fetch is the honest moment to measure them, and a
   * template that calls `Date.now()` re-measures on every change detection.
   */
  // Gates the board shows directly, so a count card would restate something you
  // are already looking at: `deferred` has a column of its own.
  //
  // `unroutable` came off this list on 2026-09-05. It was excluded because every
  // card without a skill wore a `no skill` badge — and that badge was removed
  // the same day, on the argument that the pile already had a screen. It did
  // not: this strip was filtering it out precisely because the card carried it,
  // so removing one hid both. The strip is the better home anyway — the gate
  // names the oldest items, which forty amber badges never did.
  private static readonly DERIVABLE_FROM_BOARD = new Set(['deferred']);

  protected readonly gates = computed<GateView[]>(() => {
    const now = Date.now();
    return (this.res.value()?.items ?? [])
      .filter(g => !GatesStrip.DERIVABLE_FROM_BOARD.has(g.id))
      .map(g => ({
      ...g,
      fillPct: g.threshold > 0 ? Math.min(100, (g.current / g.threshold) * 100) : 0,
      movedAge: g.last_moved_at ? age(g.last_moved_at, now) : null,
      blockers: g.blockers.map(b => ({ ...b, age: age(b.since, now) })),
    }));
  });
}

/**
 * Coarse elapsed-time label.
 *
 * @param iso timestamp to measure from
 * @param now reference time, passed in so a whole strip shares one clock
 * @returns e.g. `16d`, `4h`, `<1h`, or `''` when the timestamp is unparseable
 */
function age(iso: string, now: number): string {
  const days = (now - Date.parse(iso)) / DAY_MS;
  if (Number.isNaN(days)) return '';
  if (days >= 1) return `${Math.floor(days)}d`;
  const hours = days * 24;
  if (hours >= 1) return `${Math.floor(hours)}h`;
  return '<1h';
}
