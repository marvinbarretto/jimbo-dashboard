import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VaultCard } from '@shared/components/vault-card/vault-card';
import type { CardContext, ProjectRef } from '@shared/components/vault-card/card-context';
import type { VaultItem } from '@domain/vault';
import type { Project } from '@domain/projects';
import { EMPTY_PROJECT_BRIEF } from '@domain/projects';
import type { DispatchQueueEntry } from '@domain/dispatch';
import type { ThreadMessage } from '@domain/thread';
import { actorId, vaultItemId, projectId, dispatchId, skillId } from '@domain/ids';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

const PROJ_LOCALSHOUT: ProjectRef = { id: 'localshout',  display_name: 'localshout', color_token: '#6b95d6', short_code: 'LOC' };
const PROJ_JIMBO:      ProjectRef = { id: 'jimbo-core',  display_name: 'jimbo-core', color_token: '#5fb3a1', short_code: 'JIM' };
const PROJ_HERMES:     ProjectRef = { id: 'hermes',      display_name: 'hermes',     color_token: '#a878d6', short_code: 'HRM' };

const NOW = new Date('2026-05-08T12:00:00Z').getTime();
const ago = (hours: number): string => new Date(NOW - hours * 3_600_000).toISOString();

function baseItem(over: Partial<VaultItem>): VaultItem {
  return {
    id: vaultItemId('00000000-0000-0000-0000-000000000001'),
    seq: 1, title: 'sample', body: '',
    type: 'task', category: null,
    assigned_to: null, tags: [], acceptance_criteria: [],
    grooming_status: 'ungroomed',
    ai_priority: null, manual_priority: null, ai_rationale: null,
    priority_confidence: null, actionability: null,
    parent_id: null, is_epic: false,    archived_at: null, due_at: null, completed_at: null,
    source: null,
    created_at: ago(72),
    ...over,
  };
}

@Component({
  selector: 'app-vault-card-section',
  imports: [VaultCard, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Vault Card · all states" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Unified card driven by a discriminated <code>CardContext</code>. Every kanban state
          renders here through the same shell.
        </p>

        <div class="ui-lab__rules">
          <p class="ui-lab__subhead">Identity rules — apply everywhere a vault item card appears</p>
          <ul class="ui-lab__rule-list">
            <li>
              <strong>Project header strip</strong> — full-bleed bar at the top in the
              project's <code>color_token</code>. Project name on the left; when the card is
              a subtask, parent epic appears on the right. No project + no epic → no strip.
              <em>The strip is the only place project identity lives on the card</em> —
              don't double up with a chip or pill in the body.
            </li>
            <li>
              <strong>Owner = circle, project = bar.</strong> Actor avatar (round monogram)
              names the assignee in the identity row. Project never uses an avatar on the
              card — the colour comes from the header strip. Across the rest of the system
              the rule is <em>circle = person, rounded square = project</em>: shape never
              tells you the wrong thing.
            </li>
            <li>
              <strong>Actors are monochrome.</strong> No per-actor colour anywhere on the
              card (avatar, source attribution, mention). Primary palette stays free for
              priority and state.
            </li>
            <li>
              <strong>Priority badge mirrors the filter chip.</strong> P0–P3 use the same
              tinted-fill treatment as the kanban filter row — same colour, same weight, so
              "P1" reads identically in both surfaces.
            </li>
            <li>
              <strong>"Nd" appears once.</strong> The right-aligned age label is the single
              source — when the item is stuck in its column, the same label turns amber.
              Never show a separate stuck pill that repeats the number.
            </li>
            <li>
              <strong>Tags = topic only.</strong> Rendered as a monochrome row below the
              title, prefixed with <code>#</code>. No per-tag colour, no source/author/
              channel tags (matches the triage rule). Tags are about subject, not provenance.
            </li>
            <li>
              <strong>Project + epic are required for new items.</strong> Legacy items
              missing either render a dashed <em>"+ Add project…"</em> / <em>"+ Add parent
              epic…"</em> input at the top — inline typeahead via the shared
              <code>[appPickerInput]</code> directive. Operators can backfill without
              leaving the card.
            </li>
            <li>
              <strong>Project is picked first, epic is scoped to the project.</strong>
              The epic picker is hidden until a project is picked, and its options are
              filtered to that project's epics only — an epic belongs to one project, so
              cross-project parenting would break the "subtask inherits parent's project"
              contract.
            </li>
            <li>
              <strong>Staleness gradient applies to the body only.</strong> The amber wash
              intensifies with age; the project strip never picks it up so identity stays
              legible on the oldest cards.
            </li>
            <li>
              <strong>Archive is the default; delete is reserved.</strong> Archive
              preserves audit trail, events, and reversibility — use it for items that
              were considered and parked. Delete is only offered in the pre-dispatch funnel
              (ungroomed → classified) for rows that <em>shouldn't have existed</em>:
              accidental captures, garbled input, test artefacts. One-click — the
              optimistic-remove path restores the row if the server rejects, and the toast
              surfaces seq + title so the action is traceable.
            </li>
          </ul>
        </div>

        @for (case of cases; track case.label) {
          <div>
            <p class="ui-lab__subhead">{{ case.label }}</p>
            <div style="max-width: 320px;">
              <app-vault-card
                [context]="case.ctx"
                [projectOptions]="projectOptions"
                [epicOptions]="epicOptions" />
            </div>
          </div>
        }
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class VaultCardSection {
  // Fixture options for the inline backfill pickers — so the dashed CTAs in
  // the gallery actually open a dropdown with real-looking choices.
  readonly projectOptions: readonly Project[] = [
    { id: projectId('localshout'), display_name: 'LocalShout', description: '',  status: 'active', kind: 'major', owner_actor_id: actorId('marvin'), criteria: null, repo_url: null, color_token: '#c47a8f', short_code: 'LOC', created_at: '2026-01-01T00:00:00Z', synced_at: null, synced_commit: null, repos: null, ...EMPTY_PROJECT_BRIEF },
    { id: projectId('hermes'),     display_name: 'Hermes',     description: '',  status: 'active', kind: 'major', owner_actor_id: actorId('marvin'), criteria: null, repo_url: null, color_token: '#7a8fc4', short_code: 'HRM', created_at: '2026-01-01T00:00:00Z', synced_at: null, synced_commit: null, repos: null, ...EMPTY_PROJECT_BRIEF },
    { id: projectId('dashboard'),  display_name: 'Dashboard',  description: '',  status: 'active', kind: 'major', owner_actor_id: actorId('marvin'), criteria: null, repo_url: null, color_token: '#7ac4a4', short_code: 'DSH', created_at: '2026-01-01T00:00:00Z', synced_at: null, synced_commit: null, repos: null, ...EMPTY_PROJECT_BRIEF },
    { id: projectId('personal'),   display_name: 'Personal',   description: '',  status: 'active', kind: 'major', owner_actor_id: actorId('marvin'), criteria: null, repo_url: null, color_token: '#c4a47a', short_code: 'PSN', created_at: '2026-01-01T00:00:00Z', synced_at: null, synced_commit: null, repos: null, ...EMPTY_PROJECT_BRIEF },
  ];
  readonly epicOptions: readonly VaultItem[] = [
    baseItem({ seq: 2350, title: 'Unify kanban card components', is_epic: true, grooming_status: 'ready' }),
    baseItem({ seq: 2300, title: 'Phase B Postgres cutover',     is_epic: true, grooming_status: 'ready' }),
    baseItem({ seq: 2280, title: 'Phase C · turn boris/kipper dispatch on', is_epic: true, grooming_status: 'ready' }),
  ];

  readonly cases: ReadonlyArray<{ label: string; ctx: CardContext }> = [
    {
      label: 'grooming · ungroomed',
      ctx: {
        kind: 'grooming',
        item: baseItem({ seq: 2502, title: 'consolidate kanban card components into one', grooming_status: 'ungroomed', assigned_to: actorId('marvin') }),
        project: PROJ_LOCALSHOUT,
        owner: actorId('marvin'),
        openQuestion: null, childRollup: null, parentEpic: null,
        lastActivityAt: ago(0.1), daysInColumn: 0, source: { text: 'via manual', actorId: null }, openQuestionsCount: 0,
        sourceKind: null, sourceUrl: null,
      },
    },
    {
      label: 'grooming · missing project + epic (dashed pickers visible)',
      ctx: {
        kind: 'grooming',
        item: baseItem({ seq: 2615, title: 'figure out why pomo extension drains battery',
          grooming_status: 'ungroomed', assigned_to: actorId('marvin') }),
        project: null,
        owner: actorId('marvin'),
        openQuestion: null, childRollup: null, parentEpic: null,
        lastActivityAt: ago(2), daysInColumn: 0, source: { text: 'manual', actorId: null }, openQuestionsCount: 0,
        sourceKind: null, sourceUrl: null,
      },
    },
    {
      label: 'grooming · with tags (topic axis)',
      ctx: {
        kind: 'grooming',
        item: baseItem({ seq: 2511, title: 'pomodoro extension drains battery on long sessions',
          grooming_status: 'ungroomed', assigned_to: actorId('marvin'), manual_priority: 2,
          tags: ['pomo', 'extension', 'performance'] }),
        project: null,
        owner: actorId('marvin'),
        openQuestion: null, childRollup: null, parentEpic: null,
        lastActivityAt: ago(0.5), daysInColumn: 0, source: null, openQuestionsCount: 0,
        sourceKind: null, sourceUrl: null,
      },
    },
    {
      label: 'grooming · stuck (>14d in column)',
      ctx: {
        kind: 'grooming',
        item: baseItem({ seq: 2208, title: 'document hermes failure modes (null next_run_at + state=running stuck)',
          grooming_status: 'intake_rejected', assigned_to: actorId('marvin') }),
        project: null,
        owner: actorId('marvin'),
        openQuestion: null, childRollup: null, parentEpic: null,
        lastActivityAt: ago(24 * 18), daysInColumn: 18, source: null, openQuestionsCount: 0,
        sourceKind: null, sourceUrl: null,
      },
    },
    {
      label: 'grooming · intake_rejected with open question',
      ctx: {
        kind: 'grooming',
        item: baseItem({ seq: 2417, title: 'wire up dispatch retry button on failed cards', grooming_status: 'intake_rejected', assigned_to: actorId('marvin') }),
        project: PROJ_LOCALSHOUT,
        owner: actorId('marvin'),
        openQuestion: {
          id: 'q1' as unknown as ThreadMessage['id'],
          vault_item_id: vaultItemId('00000000-0000-0000-0000-000000000001'),
          author_actor_id: actorId('kipper'),
          kind: 'question',
          body: 'should retry preserve the original executor or pick whoever is free?',
          in_reply_to: null,
          answered_by: null,
          created_at: ago(2),
        },
        childRollup: null, parentEpic: null,
        lastActivityAt: ago(2), daysInColumn: 0, source: { text: 'via @kipper', actorId: actorId('kipper') }, openQuestionsCount: 1,
        sourceKind: null, sourceUrl: null,
      },
    },
    {
      label: 'grooming · classified with rationale',
      ctx: {
        kind: 'grooming',
        item: baseItem({ seq: 2483, title: 'add /dispatches detail page for hermes runs',
          grooming_status: 'classified', assigned_to: actorId('kipper'),
          ai_priority: 1, ai_rationale: 'unblocks operator visibility into hermes pipeline; matches Phase C item.',
          priority_confidence: 0.82 }),
        project: PROJ_JIMBO,
        owner: actorId('kipper'),
        openQuestion: null, childRollup: null, parentEpic: null,
        lastActivityAt: ago(1), daysInColumn: 0, source: { text: 'via vault-classify', actorId: null }, openQuestionsCount: 0,
        sourceKind: null, sourceUrl: null,
      },
    },
    {
      label: 'grooming · decomposed (5 acceptance criteria)',
      ctx: {
        kind: 'grooming',
        item: baseItem({ seq: 2456, title: 'extract shared kanban board layout into _board-layout.scss',
          grooming_status: 'decomposed', assigned_to: actorId('marvin'), manual_priority: 0,
          acceptance_criteria: [
            { text: '_board-layout.scss exists', done: false },
            { text: 'execution-board uses it', done: false },
            { text: 'grooming-board uses it', done: false },
            { text: 'no scss duplication remains', done: false },
            { text: 'dev server compiles cleanly', done: false },
          ],
        }),
        project: PROJ_LOCALSHOUT,
        owner: actorId('marvin'),
        openQuestion: null, childRollup: null, parentEpic: null,
        lastActivityAt: ago(3), daysInColumn: 0, source: { text: 'via vault-decompose', actorId: null }, openQuestionsCount: 0,
        sourceKind: null, sourceUrl: null,
      },
    },
    {
      label: 'grooming · ready (epic with rollup)',
      ctx: {
        kind: 'grooming',
        item: baseItem({ seq: 2401, title: 'backfill activity_events for items pre-2026-04-01',
          grooming_status: 'ready', assigned_to: actorId('boris'), manual_priority: 2, is_epic: true }),
        project: PROJ_JIMBO,
        owner: actorId('boris'),
        openQuestion: null,
        childRollup: [
          { seq: 2410, state: 'completed' },
          { seq: 2411, state: 'completed' },
          { seq: 2412, state: 'running'   },
          { seq: 2413, state: 'ready'     },
        ],
        parentEpic: null,
        lastActivityAt: ago(48), daysInColumn: 0, source: null, openQuestionsCount: 0,
        sourceKind: null, sourceUrl: null,
      },
    },
    {
      label: 'dispatch · running',
      ctx: {
        kind: 'dispatch',
        entry: {
          id: dispatchId('d-1'),
          task_id: vaultItemId('00000000-0000-0000-0000-000000000456'),
          skill: skillId('kipper/refactor-css'),
          status: 'running', executor: actorId('kipper'),
          started_at: ago(0.083), completed_at: null, retry_count: 0,
          skill_context: null, result_summary: null, error: null,
          created_at: ago(0.5), task_title: 'extract shared kanban board layout', task_seq: 2456,
        } satisfies DispatchQueueEntry,
        item: baseItem({ seq: 2456, title: 'extract shared kanban board layout', grooming_status: 'ready', assigned_to: actorId('kipper') }),
        project: PROJ_LOCALSHOUT, owner: actorId('kipper'),
        skillDisplayName: 'kipper/refactor-css', parentEpic: { seq: 2350, title: 'Unify kanban cards' },
        modelId: 'ollama/llama-3.1-8b',
        genesis: { kind: 'auto', label: '↳ #2350', parentSeq: 2350 },
      },
    },
    {
      label: 'dispatch · failed',
      ctx: {
        kind: 'dispatch',
        entry: {
          id: dispatchId('d-2'),
          task_id: vaultItemId('00000000-0000-0000-0000-000000000333'),
          skill: skillId('kipper/run-typecheck'),
          status: 'failed', executor: actorId('kipper'),
          started_at: ago(0.15), completed_at: ago(0.13), retry_count: 1,
          skill_context: null, result_summary: null,
          error: "ts(2304) · Cannot find name 'DispatchRetryPayload'.",
          created_at: ago(0.2), task_title: 'port dispatch retry mutation', task_seq: 2333,
        } satisfies DispatchQueueEntry,
        item: baseItem({ seq: 2333, title: 'port dispatch retry mutation to use new pg client',
          grooming_status: 'ready', assigned_to: actorId('kipper') }),
        project: PROJ_HERMES, owner: actorId('kipper'),
        skillDisplayName: 'kipper/run-typecheck', parentEpic: null,
        modelId: 'anthropic/claude-sonnet-4-6',
        genesis: { kind: 'manual', label: 'manual', parentSeq: null },
      },
    },
    {
      label: 'manual · ready (no dispatch)',
      ctx: {
        kind: 'manual',
        item: baseItem({ seq: 2391, title: 'review onboarding doc with new contractor on monday',
          grooming_status: 'ready', assigned_to: actorId('marvin'), manual_priority: 2 }),
        project: PROJ_JIMBO,
        owner: actorId('marvin'),
        parentEpic: null,
        source: { text: 'manual', actorId: null },
        lastActivityAt: ago(24),
        sourceKind: null, sourceUrl: null,
      },
    },
  ];
}
