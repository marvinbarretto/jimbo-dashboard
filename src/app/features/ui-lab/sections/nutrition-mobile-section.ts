import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

/**
 * THROWAWAY WIREFRAME — mobile nutrition day view redesign.
 *
 * Deliberately zero shared primitives: plain HTML/SCSS so the design can be
 * judged (on a phone) without inheriting any existing component's constraints.
 * The winning design gets extracted into the tracker family; this page then
 * dies.
 *
 * Round 1 settled the row anatomy (variant A · Ledger). This round wires the
 * interactions that killed the in-place approach: rows are read-only and the
 * WHOLE row taps into a bottom-sheet editor; adding is a single text field
 * that drops a pending row which "estimates" itself a beat later (simulating
 * Jimbo's async macro fill). State is component-local signals — no
 * persistence, no services.
 */

interface WireEntry {
  readonly id: number;
  readonly time: string; // HH:MM
  readonly label: string;
  readonly kind: 'food' | 'supplement';
  readonly kcal: number | null; // null on food = awaiting estimate
  readonly p: number | null;
  readonly c: number | null;
  readonly f: number | null;
  readonly dose: string | null;
}

/** Sheet draft — everything stringly, straight from the inputs. */
interface WireDraft {
  readonly label: string;
  readonly time: string; // datetime-local value
  readonly kcal: string;
  readonly p: string;
  readonly c: string;
  readonly f: string;
  readonly dose: string;
}

const SEED: readonly WireEntry[] = [
  { id: 1, time: '18:16', label: 'cajun chicken grills with peppers and rice 330g', kind: 'food', kcal: 498, p: 79, c: 10, f: 16, dose: null },
  { id: 2, time: '18:15', label: '1 pale ale', kind: 'food', kcal: 180, p: 2, c: 15, f: 0, dose: null },
  { id: 3, time: '12:40', label: 'chicken shawarma wrap', kind: 'food', kcal: null, p: null, c: null, f: null, dose: null },
  { id: 4, time: '08:02', label: 'creatine', kind: 'supplement', kcal: null, p: null, c: null, f: null, dose: '5 g' },
];

// What the fake "Jimbo estimate" fills into a quick-added row.
const FAKE_ESTIMATE = { kcal: 231, p: 4, c: 28, f: 9 } as const;
const WIRE_DAY = '2026-07-30'; // static date for the datetime-local field — wireframe only

@Component({
  selector: 'app-nutrition-mobile-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeSheet()' },
  template: `
    <h2>Nutrition · Mobile Wireframe</h2>
    <p class="intro">
      Ledger anatomy + the interactions that matter: <strong>tap any row</strong>
      to edit in a bottom sheet (delete lives there too), and <strong>add</strong>
      with the single field at the bottom — the new row lands as
      "estimating…" and fills itself in a moment later, like the live Jimbo
      flow. In the real page the add bar sticks to the viewport bottom.
    </p>

    <div class="frame">
      <header class="frame__head">
        <span>Today</span>
        <span>{{ entries().length }} entries · {{ totalKcal() }} kcal</span>
      </header>

      @for (e of entries(); track e.id) {
        <article class="row" (click)="openSheet(e)">
          <span class="row__time">{{ e.time }}</span>
          <span class="row__label">{{ e.label }}</span>
          @if (e.kcal !== null) {
            <span class="row__kcal">{{ e.kcal }}<small>kcal</small></span>
          }
          <span class="row__meta">
            @if (e.kind === 'supplement') {
              <em class="supp">supp</em><span class="m">{{ e.dose }}</span>
            } @else if (e.kcal === null) {
              <span class="pending">estimating…</span>
            } @else {
              <span class="m">{{ e.p }}<i>p</i></span><span class="sep">·</span><span class="m">{{ e.c }}<i>c</i></span><span class="sep">·</span><span class="m">{{ e.f }}<i>f</i></span>
            }
          </span>
        </article>
      }

      <form class="qa" (submit)="quickAdd($event)">
        <input
          class="qa__input"
          type="text"
          placeholder="what did you eat or drink?"
          aria-label="Add food or drink"
          [value]="qaText()"
          (input)="qaText.set($any($event).target.value)"
        />
        <button class="qa__btn" type="submit" aria-label="Add entry">↑</button>
      </form>
    </div>

    @if (draft(); as d) {
      <div class="scrim" (click)="closeSheet()"></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Edit entry">
        <div class="sheet__handle"></div>
        <header class="sheet__head">
          <h4>Edit entry</h4>
          <button class="sheet__close" type="button" aria-label="Close" (click)="closeSheet()">✕</button>
        </header>

        <label class="field">
          <span class="field__label">What</span>
          <input class="field__input" type="text" [value]="d.label" (input)="patch('label', $any($event))" />
        </label>

        <label class="field">
          <span class="field__label">When</span>
          <input class="field__input" type="datetime-local" [value]="d.time" (input)="patch('time', $any($event))" />
        </label>

        @if (editing()?.kind === 'food') {
          <label class="field">
            <span class="field__label">Calories</span>
            <span class="nfield nfield--hero">
              <input type="number" inputmode="numeric" min="0" [value]="d.kcal" (input)="patch('kcal', $any($event))" aria-label="Calories" />
              <span class="nfield__unit">kcal</span>
            </span>
          </label>

          <div class="macro-grid" role="group" aria-label="Macros">
            <span class="nfield">
              <input type="number" inputmode="numeric" min="0" [value]="d.p" (input)="patch('p', $any($event))" aria-label="Protein" />
              <span class="nfield__unit">p</span>
            </span>
            <span class="nfield">
              <input type="number" inputmode="numeric" min="0" [value]="d.c" (input)="patch('c', $any($event))" aria-label="Carbs" />
              <span class="nfield__unit">c</span>
            </span>
            <span class="nfield">
              <input type="number" inputmode="numeric" min="0" [value]="d.f" (input)="patch('f', $any($event))" aria-label="Fat" />
              <span class="nfield__unit">f</span>
            </span>
          </div>
        } @else {
          <label class="field">
            <span class="field__label">Dose</span>
            <input class="field__input" type="text" [value]="d.dose" (input)="patch('dose', $any($event))" />
          </label>
        }

        <button class="sheet__save" type="button" (click)="saveSheet()">Save</button>
        <button class="sheet__delete" type="button" (click)="deleteFromSheet()">Delete entry</button>
      </div>
    }
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

    /* ——— phone frame ——— */

    .frame {
      max-width: 24.5rem;
      border: 1px dashed var(--color-border);
      border-radius: 1rem;
      padding: 0.9rem 0.9rem 0.9rem;
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

    /* ——— shared tokens ——— */

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

    /* ——— ledger row (variant A, settled) ——— */

    .row {
      display: grid;
      grid-template-columns: 3rem 1fr auto;
      grid-template-areas:
        'time label kcal'
        '.    meta  kcal';
      align-items: start;
      padding: 0.7rem 0.3rem;
      cursor: pointer;
      border-radius: var(--radius);
      transition: background 100ms ease;
      -webkit-tap-highlight-color: transparent;
    }

    .row:active {
      background: color-mix(in srgb, var(--color-accent) 9%, transparent);
    }

    .row + .row {
      border-top: 1px solid color-mix(in srgb, var(--color-border) 40%, transparent);
    }

    .row__time {
      grid-area: time;
      font-size: 0.8rem;
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
      padding-top: 0.18rem; /* optically aligns with the 1rem label's first line */
    }

    .row__label {
      grid-area: label;
      font-size: 1rem;
      line-height: 1.35;
      color: var(--color-text);
      overflow-wrap: break-word;
      min-width: 0;
    }

    .row__kcal {
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

    .row__meta {
      grid-area: meta;
      margin-top: 0.3rem;
      font-size: 0.85rem;
    }

    /* ——— quick add ——— */

    .qa {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.9rem;
      padding-top: 0.9rem;
      border-top: 1px dashed color-mix(in srgb, var(--color-border) 55%, transparent);
    }

    .qa__input {
      flex: 1 1 auto;
      min-width: 0;
      height: 3rem;
      padding: 0 0.85rem;
      font: inherit;
      font-size: 1rem;
      color: var(--color-text);
      background: var(--color-bg-elevated, transparent);
      border: 1px solid var(--color-border);
      border-radius: 1.5rem;

      &::placeholder {
        color: var(--color-text-muted);
        font-style: italic;
      }

      &:focus {
        outline: none;
        border-color: var(--color-accent);
      }
    }

    .qa__btn {
      flex: 0 0 auto;
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      border: none;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--color-black, #000);
      background: var(--color-accent);
      cursor: pointer;

      &:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
      }
    }

    /* ——— bottom sheet ——— */

    .scrim {
      position: fixed;
      inset: 0;
      z-index: 40;
      background: rgb(0 0 0 / 0.55);
      animation: scrim-in 160ms ease;
    }

    .sheet {
      position: fixed;
      inset: auto 0 0 0;
      z-index: 41;
      max-width: 28rem;
      margin: 0 auto;
      padding: 0.4rem 1.1rem calc(1.1rem + env(safe-area-inset-bottom));
      background: var(--color-surface, var(--color-bg));
      border: 1px solid var(--color-border);
      border-bottom: none;
      border-radius: 1.1rem 1.1rem 0 0;
      animation: sheet-in 220ms cubic-bezier(0.2, 0.9, 0.3, 1);
    }

    @media (prefers-reduced-motion: reduce) {
      .scrim, .sheet { animation: none; }
    }

    @keyframes sheet-in {
      from { transform: translateY(40%); opacity: 0.4; }
      to   { transform: translateY(0);   opacity: 1; }
    }

    @keyframes scrim-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .sheet__handle {
      width: 2.4rem;
      height: 0.28rem;
      margin: 0.35rem auto 0.6rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-border) 80%, transparent);
    }

    .sheet__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.9rem;

      h4 {
        margin: 0;
        font-size: 0.95rem;
      }
    }

    .sheet__close {
      width: 2.4rem;
      height: 2.4rem;
      margin-right: -0.5rem;
      border: none;
      background: transparent;
      color: var(--color-text-muted);
      font-size: 1rem;
      cursor: pointer;
      border-radius: var(--radius);

      &:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
      }
    }

    .field {
      display: block;
      margin-bottom: 0.85rem;
    }

    .field__label {
      display: block;
      margin-bottom: 0.3rem;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }

    .field__input,
    .nfield {
      display: flex;
      width: 100%;
      height: 3rem;
      align-items: center;
      padding: 0 0.75rem;
      font: inherit;
      font-size: 1.05rem;
      color: var(--color-text);
      background: var(--color-bg-elevated, transparent);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
    }

    .field__input:focus {
      outline: none;
      border-color: var(--color-accent);
    }

    input[type='datetime-local'].field__input {
      font-variant-numeric: tabular-nums;
      color-scheme: dark;
    }

    /* number + unit as one bound control */
    .nfield {
      gap: 0.3rem;

      input {
        flex: 1 1 auto;
        min-width: 0;
        border: none;
        background: transparent;
        font: inherit;
        font-size: 1.05rem;
        color: var(--color-text);
        font-variant-numeric: tabular-nums;

        &:focus { outline: none; }
      }

      &:focus-within {
        border-color: var(--color-accent);
      }
    }

    .nfield--hero input {
      font-size: 1.3rem;
      font-weight: 650;
    }

    .nfield__unit {
      flex: 0 0 auto;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .macro-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.6rem;
      margin-bottom: 0.85rem;
    }

    .sheet__save {
      width: 100%;
      height: 3rem;
      margin-top: 0.35rem;
      border: 2px solid var(--color-accent);
      border-radius: var(--radius);
      background: var(--color-black, transparent);
      color: var(--color-text);
      font: inherit;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      cursor: pointer;

      &:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
      }
    }

    .sheet__delete {
      display: block;
      width: 100%;
      margin-top: 0.5rem;
      padding: 0.7rem;
      border: none;
      background: transparent;
      color: var(--color-danger);
      font: inherit;
      font-size: 0.8rem;
      cursor: pointer;
      border-radius: var(--radius);

      &:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
      }
    }
  `],
})
export class NutritionMobileSection {
  protected readonly entries = signal<readonly WireEntry[]>(SEED);
  protected readonly editing = signal<WireEntry | null>(null);
  protected readonly draft = signal<WireDraft | null>(null);
  protected readonly qaText = signal('');

  private nextId = 100;

  protected totalKcal(): number {
    return this.entries().reduce((sum, e) => sum + (e.kcal ?? 0), 0);
  }

  protected openSheet(e: WireEntry): void {
    this.editing.set(e);
    this.draft.set({
      label: e.label,
      time: `${WIRE_DAY}T${e.time}`,
      kcal: e.kcal === null ? '' : String(e.kcal),
      p: e.p === null ? '' : String(e.p),
      c: e.c === null ? '' : String(e.c),
      f: e.f === null ? '' : String(e.f),
      dose: e.dose ?? '',
    });
  }

  protected closeSheet(): void {
    this.editing.set(null);
    this.draft.set(null);
  }

  protected patch(key: keyof WireDraft, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update((d) => (d ? { ...d, [key]: value } : d));
  }

  protected saveSheet(): void {
    const target = this.editing();
    const d = this.draft();
    if (!target || !d) return;
    const num = (s: string): number | null => (s.trim() === '' ? null : Math.max(0, Math.round(Number(s))) || 0);
    this.entries.update((list) =>
      list.map((e) =>
        e.id === target.id
          ? {
              ...e,
              label: d.label.trim() || e.label,
              time: d.time.length >= 16 ? d.time.slice(11, 16) : e.time,
              kcal: e.kind === 'food' ? num(d.kcal) : e.kcal,
              p: e.kind === 'food' ? num(d.p) : e.p,
              c: e.kind === 'food' ? num(d.c) : e.c,
              f: e.kind === 'food' ? num(d.f) : e.f,
              dose: e.kind === 'supplement' ? d.dose.trim() || e.dose : e.dose,
            }
          : e,
      ),
    );
    this.closeSheet();
  }

  protected deleteFromSheet(): void {
    const target = this.editing();
    if (!target) return;
    this.entries.update((list) => list.filter((e) => e.id !== target.id));
    this.closeSheet();
  }

  protected quickAdd(event: Event): void {
    event.preventDefault();
    const label = this.qaText().trim();
    if (!label) return;
    const id = this.nextId++;
    this.entries.update((list) => [
      { id, time: '19:02', label, kind: 'food', kcal: null, p: null, c: null, f: null, dose: null },
      ...list,
    ]);
    this.qaText.set('');
    // Simulate Jimbo's async estimate landing.
    setTimeout(() => {
      this.entries.update((list) =>
        list.map((e) => (e.id === id ? { ...e, ...FAKE_ESTIMATE } : e)),
      );
    }, 1600);
  }
}
