import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VaultCard } from '@shared/components/vault-card/vault-card';
import type { CardContext, ProjectRef } from '@shared/components/vault-card/card-context';
import type { VaultItem } from '@domain/vault';
import type { DispatchQueueEntry } from '@domain/dispatch';
import type { ThreadMessage } from '@domain/thread';
import { actorId, vaultItemId, dispatchId, skillId } from '@domain/ids';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

const PROJ_LOCALSHOUT: ProjectRef = { id: 'localshout',  display_name: 'localshout', color_token: '#6b95d6' };
const PROJ_JIMBO:      ProjectRef = { id: 'jimbo-core',  display_name: 'jimbo-core', color_token: '#5fb3a1' };
const PROJ_HERMES:     ProjectRef = { id: 'hermes',      display_name: 'hermes',     color_token: '#a878d6' };

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
    parent_id: null, is_epic: false,
    archived_at: null, due_at: null, completed_at: null,
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
          renders here through the same shell — see the prototype at
          <code>/prototypes/vault-card-states.html</code> for the full design rationale.
        </p>

        @for (case of cases; track case.label) {
          <div>
            <p class="ui-lab__subhead">{{ case.label }}</p>
            <div style="max-width: 320px;">
              <app-vault-card [context]="case.ctx" />
            </div>
          </div>
        }
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class VaultCardSection {
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
          author_actor_id: actorId('ralph'),
          kind: 'question',
          body: 'should retry preserve the original executor or pick whoever is free?',
          in_reply_to: null,
          answered_by: null,
          created_at: ago(2),
        },
        childRollup: null, parentEpic: null,
        lastActivityAt: ago(2), daysInColumn: 0, source: { text: 'via @ralph', actorId: actorId('ralph') }, openQuestionsCount: 1,
      },
    },
    {
      label: 'grooming · classified with rationale',
      ctx: {
        kind: 'grooming',
        item: baseItem({ seq: 2483, title: 'add /dispatches detail page for hermes runs',
          grooming_status: 'classified', assigned_to: actorId('ralph'),
          ai_priority: 1, ai_rationale: 'unblocks operator visibility into hermes pipeline; matches Phase C item.',
          priority_confidence: 0.82 }),
        project: PROJ_JIMBO,
        owner: actorId('ralph'),
        openQuestion: null, childRollup: null, parentEpic: null,
        lastActivityAt: ago(1), daysInColumn: 0, source: { text: 'via vault-classify', actorId: null }, openQuestionsCount: 0,
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
      },
    },
    {
      label: 'dispatch · running',
      ctx: {
        kind: 'dispatch',
        entry: {
          id: dispatchId('d-1'),
          task_id: vaultItemId('00000000-0000-0000-0000-000000000456'),
          skill: skillId('ralph/refactor-css'),
          status: 'running', executor: actorId('ralph'),
          started_at: ago(0.083), completed_at: null, retry_count: 0,
          skill_context: null, result_summary: null, error: null,
          created_at: ago(0.5), task_title: 'extract shared kanban board layout', task_seq: 2456,
        } satisfies DispatchQueueEntry,
        item: baseItem({ seq: 2456, title: 'extract shared kanban board layout', grooming_status: 'ready', assigned_to: actorId('ralph') }),
        project: PROJ_LOCALSHOUT, owner: actorId('ralph'),
        skillDisplayName: 'ralph/refactor-css', parentEpic: { seq: 2350, title: 'Unify kanban cards' },
      },
    },
    {
      label: 'dispatch · failed',
      ctx: {
        kind: 'dispatch',
        entry: {
          id: dispatchId('d-2'),
          task_id: vaultItemId('00000000-0000-0000-0000-000000000333'),
          skill: skillId('ralph/run-typecheck'),
          status: 'failed', executor: actorId('ralph'),
          started_at: ago(0.15), completed_at: ago(0.13), retry_count: 1,
          skill_context: null, result_summary: null,
          error: "ts(2304) · Cannot find name 'DispatchRetryPayload'.",
          created_at: ago(0.2), task_title: 'port dispatch retry mutation', task_seq: 2333,
        } satisfies DispatchQueueEntry,
        item: baseItem({ seq: 2333, title: 'port dispatch retry mutation to use new pg client',
          grooming_status: 'ready', assigned_to: actorId('ralph') }),
        project: PROJ_HERMES, owner: actorId('ralph'),
        skillDisplayName: 'ralph/run-typecheck', parentEpic: null,
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
      },
    },
  ];
}
