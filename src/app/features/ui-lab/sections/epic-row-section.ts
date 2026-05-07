import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { EpicRow, type EpicRowVM } from '@shared/components/epic-row/epic-row';

// 'jimbo' is BOTH a project and an actor in this system — chosen as owner here so the
// project-vs-actor disambiguation (`/Jimbo` vs `@jimbo`) is visible side-by-side.
const SAMPLES: readonly EpicRowVM[] = [
  {
    id: 'note_e1a6d714',
    seq: 2462,
    title: '1% honest — lift progress vs aspirational benchmark',
    createdAt: '2026-05-06T20:25:00.000Z',
    project: { slug: 'jimbo', displayName: 'Jimbo', color: '#a78bfa' },
    owner: { id: 'marvin', displayName: 'Marvin' },
    origin: { kind: 'synthesize', date: '2026-05-06' },
    threads: ['ledger', 'curves', 'narrative'],
    crossCuttingPrinciples: ['forgiving-by-design'],
    childrenTotal: 28,
    childrenDone: 0,
    childrenBlocked: 4,
  },
  {
    id: 'note_44dc00d5',
    seq: 2444,
    title: 'Closing the intent-activity loop',
    createdAt: '2026-05-06T20:00:00.000Z',
    project: { slug: 'jimbo', displayName: 'Jimbo', color: '#a78bfa' },
    owner: { id: 'marvin', displayName: 'Marvin' },
    origin: { kind: 'synthesize', date: '2026-05-06' },
    threads: ['alignment-verdicts', 'conversation-derived-intent'],
    crossCuttingPrinciples: [],
    childrenTotal: 16,
    childrenDone: 2,
    childrenBlocked: 4,
  },
  // Future: Jimbo proposes its own venture, owns it, originates autonomously. The same
  // name 'jimbo' appears as both project (`/Jimbo`) and actor (`@jimbo`) in this row.
  {
    id: 'note_future01',
    seq: 3104,
    title: 'Auto-proposed: refactor the briefing pipeline for parallel model calls',
    createdAt: '2026-08-12T06:30:00.000Z',
    project: { slug: 'jimbo', displayName: 'Jimbo', color: '#a78bfa' },
    owner: { id: 'jimbo', displayName: 'Jimbo' },
    origin: { kind: 'jimbo-autonomous', date: '2026-08-12' },
    threads: ['perf', 'reliability'],
    crossCuttingPrinciples: [],
    childrenTotal: 6,
    childrenDone: 0,
    childrenBlocked: 0,
  },
  {
    id: 'note_ls0042',
    seq: 1980,
    title: 'Carpet-capture flow from photo to pub identification',
    createdAt: '2026-04-22T11:00:00.000Z',
    project: { slug: 'spoons', displayName: 'Spoonscount', color: '#d4a14b' },
    owner: { id: 'marvin', displayName: 'Marvin' },
    origin: { kind: 'deep-dive', date: '2026-04-20' },
    threads: ['vision', 'matching'],
    crossCuttingPrinciples: [],
    childrenTotal: 12,
    childrenDone: 8,
    childrenBlocked: 0,
  },
  {
    id: 'note_legacy01',
    seq: 2328,
    title: 'Build token cost reporting query or endpoint for Jimbo',
    createdAt: '2026-03-15T09:00:00.000Z',
    project: { slug: 'jimbo', displayName: 'Jimbo', color: '#a78bfa' },
    owner: { id: 'marvin', displayName: 'Marvin' },
    origin: null,
    threads: [],
    crossCuttingPrinciples: [],
    childrenTotal: 3,
    childrenDone: 1,
    childrenBlocked: 0,
  },
  {
    id: 'note_orphan01',
    seq: 2199,
    title: 'Orphan epic — no project color, no metadata',
    createdAt: '2026-02-01T09:00:00.000Z',
    project: { slug: 'unknown', displayName: 'Unrouted', color: null },
    owner: null,
    origin: null,
    threads: [],
    crossCuttingPrinciples: [],
    childrenTotal: 0,
    childrenDone: 0,
    childrenBlocked: 0,
  },
];

@Component({
  selector: 'app-epic-row-section',
  imports: [UiSection, UiStack, EpicRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Epic Row" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Single-element epic visualisation in three layouts — compact (1 line), standard (2 lines),
          spacious (3 lines). Same view-model, different vertical spread. All metadata visible by
          default per "always show more then refine later." Differentiation uses shape, prefix
          sigil, casing, weight, italic, position, and conditional rendering — not just color.
        </p>

        <p class="ui-lab__support-copy">
          <strong>Project vs actor disambiguation:</strong> projects render <code>/slug</code>
          (with dot + project color), actors render <code>@slug</code> (no color, plain border).
          The future autonomous-Jimbo row below has both <code>/Jimbo</code> as project and
          <code>&#64;jimbo</code> as owner — readable at a glance even in monochrome.
        </p>

        <div class="ui-lab__subhead">Compact — 1 line, dense scan</div>
        <div class="lab-epic-list">
          @for (epic of samples; track epic.id) {
            <app-epic-row [epic]="epic" layout="compact" />
          }
        </div>

        <div class="ui-lab__subhead">Standard — 2 lines, head row + indented meta strip</div>
        <div class="lab-epic-list">
          @for (epic of samples; track epic.id) {
            <app-epic-row [epic]="epic" layout="standard" />
          }
        </div>

        <div class="ui-lab__subhead">Spacious — 3 lines, top context / title / bottom provenance</div>
        <div class="lab-epic-list">
          @for (epic of samples; track epic.id) {
            <app-epic-row [epic]="epic" layout="spacious" />
          }
        </div>

        <div class="ui-lab__subhead">Same epic, all three layouts side-by-side</div>
        <div class="lab-epic-list">
          <app-epic-row [epic]="samples[0]" layout="compact" />
          <app-epic-row [epic]="samples[0]" layout="standard" />
          <app-epic-row [epic]="samples[0]" layout="spacious" />
        </div>

        <div class="ui-lab__subhead">The disambiguation case: future Jimbo proposes its own work</div>
        <p class="ui-lab__support-copy">
          Project = <code>/Jimbo</code> (purple dot, color-bordered). Owner = <code>&#64;jimbo</code>
          (plain border, no color). Same name, distinct visual shape — works even with no color.
        </p>
        <div class="lab-epic-list">
          <app-epic-row [epic]="samples[2]" layout="compact" />
          <app-epic-row [epic]="samples[2]" layout="standard" />
          <app-epic-row [epic]="samples[2]" layout="spacious" />
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
  styles: [`
    .lab-epic-list {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      overflow: hidden;
      background: var(--color-surface);
    }

    .lab-epic-list app-epic-row:last-child {
      border-bottom: none;
    }
  `],
})
export class EpicRowSection {
  protected readonly samples = SAMPLES;
}
