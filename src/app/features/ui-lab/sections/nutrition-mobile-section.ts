import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * THROWAWAY WIREFRAME — mobile nutrition day view redesign.
 *
 * Deliberately zero shared primitives: plain HTML/SCSS so the design can be
 * judged (on a phone) without inheriting any existing component's constraints.
 * The winning variant gets extracted into the tracker family; this page then
 * dies. Rows are read-only by design — editing moves to a bottom sheet
 * (next wireframe atom), so rows never morph on tap.
 */

interface WireMacro {
  readonly v: string;
  readonly u: string;
}

interface WireEntry {
  readonly time: string;
  readonly label: string;
  readonly kind: 'food' | 'supplement';
  /** null = awaiting estimate (food) or not applicable (supplement) */
  readonly kcal: number | null;
  readonly macros: readonly WireMacro[];
}

// One long label (wrap test), one short, one pending, one supplement —
// every rendering state the live ledger produces.
const ENTRIES: readonly WireEntry[] = [
  {
    time: '18:16',
    label: 'cajun chicken grills with peppers and rice 330g',
    kind: 'food',
    kcal: 498,
    macros: [{ v: '79', u: 'p' }, { v: '10', u: 'c' }, { v: '16', u: 'f' }],
  },
  {
    time: '18:15',
    label: '1 pale ale',
    kind: 'food',
    kcal: 180,
    macros: [{ v: '2', u: 'p' }, { v: '15', u: 'c' }, { v: '0', u: 'f' }],
  },
  {
    time: '12:40',
    label: 'chicken shawarma wrap',
    kind: 'food',
    kcal: null,
    macros: [],
  },
  {
    time: '08:02',
    label: 'creatine',
    kind: 'supplement',
    kcal: null,
    macros: [{ v: '5', u: 'g' }],
  },
];

@Component({
  selector: 'app-nutrition-mobile-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Nutrition · Mobile Wireframe</h2>
    <p class="intro">
      Read-state row anatomy, three ways. Rows are display-only — tapping one
      will open an edit sheet (next atom), so nothing morphs in place. Judge:
      what does your eye land on first, does the long label read cleanly, do
      the macros feel bound to their entry?
    </p>

    <div class="variants">

      <!-- A · Ledger — time-first, closest evolution of the current row -->
      <section class="variant">
        <h3>A · Ledger</h3>
        <p class="why">Time anchors the left edge; kcal owns the right. Scans as "the day, hour by hour".</p>
        <div class="frame">
          <header class="frame__head">
            <span>Today</span>
            <span>4 entries · 678 kcal</span>
          </header>
          @for (e of entries; track e.time) {
            <article class="wa">
              <span class="wa__time">{{ e.time }}</span>
              <span class="wa__label">{{ e.label }}</span>
              @if (e.kcal !== null) {
                <span class="wa__kcal">{{ e.kcal }}<small>kcal</small></span>
              }
              <span class="wa__meta">
                @if (e.kind === 'supplement') {
                  <em class="supp">supp</em>
                }
                @if (e.kind === 'food' && e.kcal === null) {
                  <span class="pending">estimating…</span>
                } @else {
                  @for (m of e.macros; track m.u; let last = $last) {
                    <span class="m">{{ m.v }}<i>{{ m.u }}</i></span>@if (!last) {<span class="sep">·</span>}
                  }
                }
              </span>
            </article>
          }
        </div>
      </section>

      <!-- B · Name-first — food is the headline, time demoted to meta -->
      <section class="variant">
        <h3>B · Name-first</h3>
        <p class="why">"What did I eat" leads; time and macros share one quiet meta line. Most whitespace.</p>
        <div class="frame">
          <header class="frame__head">
            <span>Today</span>
            <span>4 entries · 678 kcal</span>
          </header>
          @for (e of entries; track e.time) {
            <article class="wb">
              <div class="wb__main">
                <p class="wb__label">{{ e.label }}</p>
                <p class="wb__meta">
                  <span class="m">{{ e.time }}</span>
                  @if (e.kind === 'supplement') {
                    <span class="sep">·</span><em class="supp">supp</em>
                  }
                  @if (e.kind === 'food' && e.kcal === null) {
                    <span class="sep">·</span><span class="pending">estimating…</span>
                  } @else {
                    @for (m of e.macros; track m.u) {
                      <span class="sep">·</span><span class="m">{{ m.v }}<i>{{ m.u }}</i></span>
                    }
                  }
                </p>
              </div>
              @if (e.kcal !== null) {
                <span class="wb__kcal">{{ e.kcal }}<small>kcal</small></span>
              }
            </article>
          }
        </div>
      </section>

      <!-- C · Timeline — a literal rail down the day -->
      <section class="variant">
        <h3>C · Timeline</h3>
        <p class="why">Times hang on a rail — the day reads as a story. Strongest structure, most ink.</p>
        <div class="frame">
          <header class="frame__head">
            <span>Today</span>
            <span>4 entries · 678 kcal</span>
          </header>
          @for (e of entries; track e.time) {
            <article class="wc">
              <span class="wc__time">{{ e.time }}</span>
              <span class="wc__rail"></span>
              <div class="wc__body">
                <div class="wc__top">
                  <span class="wc__label">{{ e.label }}</span>
                  @if (e.kcal !== null) {
                    <span class="wc__kcal">{{ e.kcal }}<small>kcal</small></span>
                  }
                </div>
                <p class="wc__meta">
                  @if (e.kind === 'supplement') {
                    <em class="supp">supp</em>
                  }
                  @if (e.kind === 'food' && e.kcal === null) {
                    <span class="pending">estimating…</span>
                  } @else {
                    @for (m of e.macros; track m.u; let last = $last) {
                      <span class="m">{{ m.v }}<i>{{ m.u }}</i></span>@if (!last) {<span class="sep">·</span>}
                    }
                  }
                </p>
              </div>
            </article>
          }
        </div>
      </section>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      max-width: 100%;
    }

    h2 { margin: 0 0 0.35rem; }

    .intro {
      margin: 0 0 1.5rem;
      max-width: 44rem;
      color: var(--color-text-muted);
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .variants {
      display: flex;
      flex-wrap: wrap;
      gap: 2rem;
      align-items: flex-start;
    }

    .variant {
      flex: 0 1 24.5rem;
      min-width: 0;
      width: 100%;
    }

    .variant h3 {
      margin: 0 0 0.2rem;
      font-size: 0.95rem;
    }

    .why {
      margin: 0 0 0.6rem;
      font-size: 0.78rem;
      color: var(--color-text-muted);
      line-height: 1.45;
    }

    /* ——— phone frame ——— */

    .frame {
      border: 1px dashed var(--color-border);
      border-radius: 1rem;
      padding: 0.9rem 0.9rem 1.1rem;
      background: var(--color-bg, transparent);
    }

    .frame__head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding-bottom: 0.75rem;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);

      span:first-child {
        color: var(--color-text);
        font-weight: 700;
      }
    }

    /* ——— shared row tokens ——— */

    article {
      cursor: pointer;
      border-radius: var(--radius);
      transition: background 100ms ease;
    }

    article:active {
      background: color-mix(in srgb, var(--color-accent) 9%, transparent);
    }

    .m {
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;

      i {
        font-style: normal;
        font-size: 0.72em;
        opacity: 0.65;
        margin-left: 0.04em;
      }
    }

    .sep {
      color: var(--color-text-muted);
      opacity: 0.45;
      margin: 0 0.35rem;
    }

    .supp {
      font-style: normal;
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--color-info);
      border: 1px solid color-mix(in srgb, var(--color-info) 45%, transparent);
      border-radius: var(--radius);
      padding: 0.05rem 0.3rem;
      margin-right: 0.45rem;
      vertical-align: 0.1em;
    }

    .pending {
      font-style: italic;
      color: var(--color-text-muted);
      opacity: 0.85;
    }

    small {
      display: block;
      font-size: 0.6rem;
      font-weight: 400;
      letter-spacing: 0.04em;
      color: var(--color-text-muted);
      text-align: right;
      line-height: 1.3;
    }

    /* ——— A · Ledger ——— */

    .wa {
      display: grid;
      grid-template-columns: 3rem 1fr auto;
      grid-template-areas:
        'time label kcal'
        '.    meta  kcal';
      align-items: start;
      padding: 0.7rem 0.3rem;
    }

    .wa + .wa {
      border-top: 1px solid color-mix(in srgb, var(--color-border) 40%, transparent);
    }

    .wa__time {
      grid-area: time;
      font-size: 0.8rem;
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
      padding-top: 0.18rem; /* optically aligns with the 1rem label's first line */
    }

    .wa__label {
      grid-area: label;
      font-size: 1rem;
      line-height: 1.35;
      color: var(--color-text);
      overflow-wrap: break-word;
      min-width: 0;
    }

    .wa__kcal {
      grid-area: kcal;
      justify-self: end;
      margin-left: 0.75rem;
      font-size: 1.3rem;
      font-weight: 650;
      letter-spacing: -0.01em;
      line-height: 1.15;
      color: var(--color-text);
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    .wa__meta {
      grid-area: meta;
      margin-top: 0.3rem;
      font-size: 0.85rem;
    }

    /* ——— B · Name-first ——— */

    .wb {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 0.3rem;
    }

    .wb + .wb {
      border-top: 1px solid color-mix(in srgb, var(--color-border) 40%, transparent);
    }

    .wb__main {
      flex: 1 1 auto;
      min-width: 0;
    }

    .wb__label {
      margin: 0;
      font-size: 1rem;
      line-height: 1.35;
      color: var(--color-text);
      overflow-wrap: break-word;
    }

    .wb__meta {
      margin: 0.3rem 0 0;
      font-size: 0.85rem;

      .sep:first-child { margin-left: 0; }
    }

    .wb__kcal {
      flex: 0 0 auto;
      font-size: 1.3rem;
      font-weight: 650;
      letter-spacing: -0.01em;
      line-height: 1.15;
      color: var(--color-text);
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    /* ——— C · Timeline ——— */

    .wc {
      display: grid;
      grid-template-columns: 3rem auto 1fr;
      column-gap: 0.7rem;
      /* rail is continuous: rows own vertical padding, rail spans it all */
      padding: 0;
    }

    .wc__time {
      font-size: 0.8rem;
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
      text-align: right;
      padding: 0.85rem 0 0;
    }

    .wc__rail {
      position: relative;
      width: 2px;
      background: color-mix(in srgb, var(--color-border) 55%, transparent);
      justify-self: center;
    }

    /* the entry dot, pinned level with the first text line */
    .wc__rail::before {
      content: '';
      position: absolute;
      top: 1.05rem;
      left: 50%;
      transform: translateX(-50%);
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-accent);
    }

    .wc:first-of-type .wc__rail { border-top-left-radius: 2px; }

    .wc__body {
      min-width: 0;
      padding: 0.85rem 0;
    }

    .wc__top {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .wc__label {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 1rem;
      line-height: 1.35;
      color: var(--color-text);
      overflow-wrap: break-word;
    }

    .wc__kcal {
      flex: 0 0 auto;
      font-size: 1.3rem;
      font-weight: 650;
      letter-spacing: -0.01em;
      line-height: 1.15;
      color: var(--color-text);
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    .wc__meta {
      margin: 0.3rem 0 0;
      font-size: 0.85rem;
    }
  `],
})
export class NutritionMobileSection {
  protected readonly entries = ENTRIES;
}
