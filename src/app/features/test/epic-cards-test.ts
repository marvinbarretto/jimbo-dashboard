import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EpicCard, type EpicCardVM } from '@shared/components/epic-card/epic-card';

// Test page for iterating epic-card variants. Lives outside ui-lab so we can experiment
// freely; promote winning variants to ui-lab once a shape is settled.
//
// Same VM rendered into all four variants side-by-side — direct comparison is the point.

const SAMPLES: readonly EpicCardVM[] = [
  {
    id: 'note_e1a6d714',
    seq: 2462,
    title: '1% honest — lift progress vs aspirational benchmark',
    bodyExcerpt: 'Build a gym progress tracker that overlays your actual lift data against a theoretical 1%-daily-growth curve, with the gap between them as the central insight. Designed from day one for operator unreliability — gaps, missed weeks, and lost interest are part of the data, not against it.',
    createdAt: '2026-05-06T20:25:00.000Z',
    lastTouchedAt: '2026-05-06T22:14:00.000Z',
    project: { slug: 'jimbo', displayName: 'Jimbo', color: '#a78bfa' },
    owner: { id: 'marvin', displayName: 'Marvin' },
    origin: { kind: 'synthesize', date: '2026-05-06' },
    threads: [
      { name: 'ledger',    itemCount: 6, doneCount: 0 },
      { name: 'curves',    itemCount: 3, doneCount: 0 },
      { name: 'narrative', itemCount: 2, doneCount: 0 },
    ],
    crossCuttingPrinciples: ['forgiving-by-design'],
    childrenTotal: 28,
    childrenDone: 0,
    childrenBlocked: 4,
    childrenByType: { research: 5, task: 6, idea: 2, reference: 15 },
  },
  {
    id: 'note_44dc00d5',
    seq: 2444,
    title: 'Closing the intent-activity loop',
    bodyExcerpt: 'Right now Marvin both authors his own intent (manually maintained priorities/goals) and judges his own momentum. Both roles are unreliable. This epic closes the loop: Jimbo as scribe + judge, conversation-derived intent + verdict-style alignment checks.',
    createdAt: '2026-05-06T20:00:00.000Z',
    lastTouchedAt: '2026-05-06T20:42:00.000Z',
    project: { slug: 'jimbo', displayName: 'Jimbo', color: '#a78bfa' },
    owner: { id: 'marvin', displayName: 'Marvin' },
    origin: { kind: 'synthesize', date: '2026-05-06' },
    threads: [
      { name: 'alignment-verdicts',         itemCount: 5, doneCount: 0 },
      { name: 'conversation-derived-intent', itemCount: 4, doneCount: 0 },
    ],
    crossCuttingPrinciples: [],
    childrenTotal: 16,
    childrenDone: 2,
    childrenBlocked: 4,
    childrenByType: { research: 4, task: 4, idea: 2, reference: 6 },
  },
  // Future Jimbo-autonomous case — same name as project AND actor in one card.
  {
    id: 'note_future01',
    seq: 3104,
    title: 'Auto-proposed: refactor the briefing pipeline for parallel model calls',
    bodyExcerpt: 'Briefing generation currently runs model calls sequentially, taking ~30s. Parallel calls with deduped prompt cache could bring it under 10s. Estimated impact: morning briefing arrives before Marvin opens the dashboard.',
    createdAt: '2026-08-12T06:30:00.000Z',
    lastTouchedAt: '2026-08-12T06:30:00.000Z',
    project: { slug: 'jimbo', displayName: 'Jimbo', color: '#a78bfa' },
    owner: { id: 'jimbo', displayName: 'Jimbo' },
    origin: { kind: 'jimbo-autonomous', date: '2026-08-12' },
    threads: [
      { name: 'perf',        itemCount: 3, doneCount: 0 },
      { name: 'reliability', itemCount: 3, doneCount: 0 },
    ],
    crossCuttingPrinciples: [],
    childrenTotal: 6,
    childrenDone: 0,
    childrenBlocked: 0,
    childrenByType: { research: 2, task: 4, idea: 0, reference: 0 },
  },
  {
    id: 'note_ls0042',
    seq: 1980,
    title: 'Carpet-capture flow from photo to pub identification',
    bodyExcerpt: 'Walk into a Wetherspoons, snap the carpet, get pub ID + auto check-in. End-to-end vision pipeline from device photo to canonical pub match.',
    createdAt: '2026-04-22T11:00:00.000Z',
    lastTouchedAt: '2026-05-04T09:15:00.000Z',
    project: { slug: 'spoons', displayName: 'Spoonscount', color: '#d4a14b' },
    owner: { id: 'marvin', displayName: 'Marvin' },
    origin: { kind: 'deep-dive', date: '2026-04-20' },
    threads: [
      { name: 'vision',   itemCount: 7, doneCount: 5 },
      { name: 'matching', itemCount: 5, doneCount: 3 },
    ],
    crossCuttingPrinciples: [],
    childrenTotal: 12,
    childrenDone: 8,
    childrenBlocked: 0,
    childrenByType: { research: 3, task: 8, idea: 1, reference: 0 },
  },
];

@Component({
  selector: 'app-epic-cards-test',
  imports: [EpicCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="test-page">
      <header class="test-page__head">
        <h1>Epic cards — test</h1>
        <p>Iteration sandbox. Promote winning variants to ui-lab once shape is settled.</p>
      </header>

      <section class="test-page__section">
        <h2>Same epic, four variants — direct compare</h2>
        <div class="grid grid--2">
          <div class="grid__cell">
            <span class="label">compact</span>
            <app-epic-card [epic]="samples[0]" variant="compact" />
          </div>
          <div class="grid__cell">
            <span class="label">detail</span>
            <app-epic-card [epic]="samples[0]" variant="detail" />
          </div>
          <div class="grid__cell">
            <span class="label">narrative</span>
            <app-epic-card [epic]="samples[0]" variant="narrative" />
          </div>
          <div class="grid__cell">
            <span class="label">status</span>
            <app-epic-card [epic]="samples[0]" variant="status" />
          </div>
        </div>
      </section>

      <section class="test-page__section">
        <h2>Compact — dashboard-grid usage</h2>
        <p class="hint">Imagine a 3- or 4-column grid on a project page.</p>
        <div class="grid grid--3">
          @for (epic of samples; track epic.id) {
            <app-epic-card [epic]="epic" variant="compact" />
          }
        </div>
      </section>

      <section class="test-page__section">
        <h2>Detail — informationally rich baseline</h2>
        <div class="stack">
          @for (epic of samples; track epic.id) {
            <app-epic-card [epic]="epic" variant="detail" />
          }
        </div>
      </section>

      <section class="test-page__section">
        <h2>Narrative — body-forward reading mode</h2>
        <div class="grid grid--2">
          @for (epic of samples; track epic.id) {
            <app-epic-card [epic]="epic" variant="narrative" />
          }
        </div>
      </section>

      <section class="test-page__section">
        <h2>Status — ops view, progress-dominant</h2>
        <div class="grid grid--3">
          @for (epic of samples; track epic.id) {
            <app-epic-card [epic]="epic" variant="status" />
          }
        </div>
      </section>

      <section class="test-page__section">
        <h2>Disambiguation case — Jimbo as project AND actor</h2>
        <p class="hint">samples[2] has <code>/Jimbo</code> as project and <code>&#64;jimbo</code> as owner.</p>
        <div class="grid grid--2">
          <app-epic-card [epic]="samples[2]" variant="compact" />
          <app-epic-card [epic]="samples[2]" variant="detail" />
          <app-epic-card [epic]="samples[2]" variant="narrative" />
          <app-epic-card [epic]="samples[2]" variant="status" />
        </div>
      </section>
    </main>
  `,
  styles: [`
    .test-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem 2rem 4rem;
      color: var(--color-text);
    }

    .test-page__head {
      margin-bottom: 2rem;

      h1 {
        font-size: 1.6rem;
        margin: 0 0 0.3rem;
      }

      p {
        margin: 0;
        color: var(--color-text-muted);
        font-size: 0.85rem;
      }
    }

    .test-page__section {
      margin-bottom: 3rem;

      h2 {
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 0.4rem;
        color: var(--color-text);
      }

      .hint {
        margin: 0 0 1rem;
        color: var(--color-text-muted);
        font-size: 0.8rem;
      }
    }

    .grid {
      display: grid;
      gap: 1rem;
    }

    .grid--2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .grid--3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    @media (max-width: 900px) {
      .grid--3 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 600px) {
      .grid--2,
      .grid--3 {
        grid-template-columns: 1fr;
      }
    }

    .grid__cell {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .label {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .stack {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
  `],
})
export class EpicCardsTest {
  protected readonly samples = SAMPLES;
}
