import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { VaultCard } from '@shared/components/vault-card/vault-card';
import { KanbanColumn } from '@shared/components/kanban-column/kanban-column';
import { UiSection } from '@shared/components/ui-section/ui-section';
import type { GroomingCardContext, ProjectRef } from '@shared/components/vault-card/card-context';
import type { VaultItem, GroomingStatus, AcceptanceCriterion, Priority, SourceKind } from '@domain/vault';
import type { VaultItem as VaultItemType } from '@domain/vault';
import type { Project } from '@domain/projects';
import { EMPTY_PROJECT_BRIEF } from '@domain/projects';
import type { ThreadMessage } from '@domain/thread';
import type { ChildStatus } from '@shared/components/epic-rollup/epic-rollup';
import { actorId, vaultItemId, projectId, threadMessageId } from '@domain/ids';
import { createKanbanDragState } from '@shared/kanban/drag-state';

// ── Fixture data ─────────────────────────────────────────────────────────────

const DEMO_NOW = new Date('2026-05-12T12:00:00Z').getTime();
const ago = (hours: number): string => new Date(DEMO_NOW - hours * 3_600_000).toISOString();

const PROJ_LOCALSHOUT: ProjectRef = { id: 'localshout',  display_name: 'LocalShout',  color_token: '#6b95d6' };
const PROJ_JIMBO:      ProjectRef = { id: 'jimbo-core',  display_name: 'jimbo-core',  color_token: '#5fb3a1' };
const PROJ_HERMES:     ProjectRef = { id: 'hermes',      display_name: 'Hermes',      color_token: '#a878d6' };

const DEMO_QUESTION: ThreadMessage = {
  id: threadMessageId('demo-q1'),
  vault_item_id: vaultItemId('00000000-0000-0000-0000-000000000kk1'),
  author_actor_id: actorId('ralph'),
  kind: 'question',
  body: 'Should this update the shared pipeline or only the local preview state?',
  in_reply_to: null,
  answered_by: null,
  created_at: ago(3),
};

const DEMO_CRITERIA: AcceptanceCriterion[] = [
  { text: 'Column layout renders with consistent gap', done: false },
  { text: 'Drag handle is accessible via keyboard', done: false },
  { text: 'Drop target highlights correctly', done: false },
];

const DEMO_ROLLUP: ChildStatus[] = [
  { seq: 2510, state: 'completed' },
  { seq: 2511, state: 'completed' },
  { seq: 2512, state: 'running'   },
];

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

// ── Card slot definition ──────────────────────────────────────────────────────

interface DemoCardSlot {
  readonly id: string;
  readonly seq: number;
  readonly title: string;
  readonly defaultTags: string[];
  readonly defaultStatus: GroomingStatus;
}

const DEMO_CARDS: readonly DemoCardSlot[] = [
  // Ungroomed (3)
  { id: 'k1', seq: 2489, title: 'audit vault-card imports — remove stale barrel re-exports', defaultTags: ['vault', 'cleanup'], defaultStatus: 'ungroomed' },
  { id: 'k2', seq: 2513, title: 'add keyboard shortcut to dismiss pomo overlay', defaultTags: ['pomo', 'a11y'], defaultStatus: 'ungroomed' },
  { id: 'k3', seq: 2527, title: 'document hermes watchdog retry logic in runbook', defaultTags: ['hermes', 'docs'], defaultStatus: 'ungroomed' },
  // Classified (2)
  { id: 'k4', seq: 2541, title: 'migrate grooming board column order to GROOMING_STATUS_ORDER const', defaultTags: ['grooming', 'refactor'], defaultStatus: 'classified' },
  { id: 'k5', seq: 2558, title: 'wire up open-questions badge count on grooming kanban header', defaultTags: ['grooming', 'badges'], defaultStatus: 'classified' },
  // Decomposed (1)
  { id: 'k6', seq: 2588, title: 'extract shared _board-layout.scss used by grooming + execution boards', defaultTags: ['scss', 'architecture'], defaultStatus: 'decomposed' },
  // Ready (2)
  { id: 'k7', seq: 2611, title: 'backfill days_in_column for items created before audit table migration', defaultTags: ['db', 'migration'], defaultStatus: 'ready' },
  { id: 'k8', seq: 2627, title: 'add sticky column header to grooming kanban on long card lists', defaultTags: ['grooming', 'ux'], defaultStatus: 'ready' },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface ControlState {
  readonly priority:      Priority | null;
  // null = unassigned (exercises the vault-card--unassigned path)
  readonly assignee:      'marvin' | 'boris' | 'ralph' | null;
  readonly ageHours:      number;
  readonly daysInCol:     number;
  readonly showProject:   boolean;
  readonly showTags:      boolean;
  readonly isEpic:        boolean;
  readonly showQuestion:  boolean;
  // Source simulation — drives vault-card--github / --pr-comment / --agent etc.
  readonly sourceKind:    SourceKind | null;
  // Action button display mode for all demo cards.
  readonly actionDisplay: 'icon' | 'label' | 'icon+label';
}

@Component({
  selector: 'app-vault-card-kanban-section',
  imports: [VaultCard, KanbanColumn, UiSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  styles: [`
    .kk-controls {
      margin-bottom: 1rem;
    }
    fieldset.kk-ctrl-group {
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 0.75rem 1rem;
      background: var(--color-surface-soft, var(--color-surface));
    }
    fieldset.kk-ctrl-group legend {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-text-muted);
    }
    .kk-ctrl-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
    }
    .kk-ctrl-row + .kk-ctrl-row {
      margin-top: 0.6rem;
      padding-top: 0.6rem;
      border-top: 1px solid var(--color-border);
    }
    .kk-ctrl {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .kk-ctrl--check {
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
    }
    .kk-ctrl__label {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
      font-weight: 600;
    }
    .kk-ctrl__select {
      font: inherit;
      font-size: 0.78rem;
      padding: 0.25rem 0.4rem;
      background: var(--color-bg);
      color: var(--color-text);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      cursor: pointer;
    }
    .kk-board {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      min-height: 400px;
    }
    .kk-card-wrap {
      transition: opacity 0.15s;
      cursor: grab;
    }
    .kk-card-wrap--dragging {
      opacity: 0.35;
      cursor: grabbing;
    }
  `],
  template: `
    <app-ui-section title="Vault Card · Kanban" [collapsible]="false">

      <!-- Controls bar -->
      <div class="kk-controls">
        <fieldset class="kk-ctrl-group">
          <legend>Controls</legend>
          <div class="kk-ctrl-row">

            <div class="kk-ctrl">
              <label class="kk-ctrl__label" for="kk-priority">Priority</label>
              <select id="kk-priority" class="kk-ctrl__select" (change)="setCtrlPriority($event)">
                <option value="">—</option>
                <option value="0">P0</option>
                <option value="1">P1</option>
                <option value="2">P2</option>
                <option value="3">P3</option>
              </select>
            </div>

            <div class="kk-ctrl">
              <label class="kk-ctrl__label" for="kk-assignee">Assignee (ownership)</label>
              <select id="kk-assignee" class="kk-ctrl__select" (change)="setCtrlAssignee($event)">
                <option value="marvin">marvin (mine)</option>
                <option value="boris">boris (theirs)</option>
                <option value="ralph">ralph (theirs)</option>
                <option value="">— unassigned</option>
              </select>
            </div>

            <div class="kk-ctrl">
              <label class="kk-ctrl__label" for="kk-source">Source kind</label>
              <select id="kk-source" class="kk-ctrl__select" (change)="setCtrlSourceKind($event)">
                <option value="">manual</option>
                <option value="github">github</option>
                <option value="pr-comment">pr-comment</option>
                <option value="agent">agent</option>
                <option value="email">email</option>
                <option value="url">url</option>
              </select>
            </div>

            <div class="kk-ctrl">
              <label class="kk-ctrl__label" for="kk-action-display">Action display</label>
              <select id="kk-action-display" class="kk-ctrl__select" (change)="setCtrlActionDisplay($event)">
                <option value="icon+label">icon + label</option>
                <option value="icon">icon only</option>
                <option value="label">label only</option>
              </select>
            </div>

            <div class="kk-ctrl">
              <label class="kk-ctrl__label" for="kk-age">Age</label>
              <select id="kk-age" class="kk-ctrl__select" (change)="setCtrlAge($event)">
                <option value="1">1h</option>
                <option value="6">6h</option>
                <option value="48">2d</option>
                <option value="168">7d</option>
                <option value="432">18d</option>
              </select>
            </div>

            <div class="kk-ctrl">
              <label class="kk-ctrl__label" for="kk-days-in-col">Days in column</label>
              <select id="kk-days-in-col" class="kk-ctrl__select" (change)="setCtrlDaysInCol($event)">
                <option value="0">0</option>
                <option value="3">3</option>
                <option value="8">8</option>
                <option value="15">15</option>
                <option value="21">21</option>
              </select>
            </div>

          </div>
          <div class="kk-ctrl-row">

            <label class="kk-ctrl kk-ctrl--check">
              <input type="checkbox" checked (change)="setCtrlShowProject($event)" />
              <span class="kk-ctrl__label">Project</span>
            </label>

            <label class="kk-ctrl kk-ctrl--check">
              <input type="checkbox" (change)="setCtrlShowTags($event)" />
              <span class="kk-ctrl__label">Tags</span>
            </label>

            <label class="kk-ctrl kk-ctrl--check">
              <input type="checkbox" (change)="setCtrlIsEpic($event)" />
              <span class="kk-ctrl__label">Is Epic</span>
            </label>

            <label class="kk-ctrl kk-ctrl--check">
              <input type="checkbox" (change)="setCtrlShowQuestion($event)" />
              <span class="kk-ctrl__label">Open Question</span>
            </label>

          </div>
        </fieldset>
      </div>

      <!-- Board -->
      <div class="kk-board">

        <app-kanban-column
          label="Ungroomed"
          [count]="cardsUngroomed().length"
          [dropEligible]="drag.isEligibleDropTarget('ungroomed')"
          [dropActive]="drag.dropTarget() === 'ungroomed'"
          emptyLabel="No ungroomed items"
          (dragover)="drag.onDragOver($event, 'ungroomed')"
          (dragleave)="drag.onDragLeave('ungroomed')"
          (drop)="onDrop($event, 'ungroomed')">
          @for (card of cardsUngroomed(); track card.item.id) {
            <div class="kk-card-wrap"
              draggable="true"
              [class.kk-card-wrap--dragging]="drag.dragging() === card.item.id"
              (dragstart)="drag.onDragStart($event, card.item.id)"
              (dragend)="drag.onDragEnd()">
              <app-vault-card
                [context]="card"
                [actionDisplay]="_controls().actionDisplay"
                [projectOptions]="projectOptions"
                [epicOptions]="epicOptions" />
            </div>
          }
        </app-kanban-column>

        <app-kanban-column
          label="Classified"
          [count]="cardsClassified().length"
          [dropEligible]="drag.isEligibleDropTarget('classified')"
          [dropActive]="drag.dropTarget() === 'classified'"
          emptyLabel="Nothing classified yet"
          (dragover)="drag.onDragOver($event, 'classified')"
          (dragleave)="drag.onDragLeave('classified')"
          (drop)="onDrop($event, 'classified')">
          @for (card of cardsClassified(); track card.item.id) {
            <div class="kk-card-wrap"
              draggable="true"
              [class.kk-card-wrap--dragging]="drag.dragging() === card.item.id"
              (dragstart)="drag.onDragStart($event, card.item.id)"
              (dragend)="drag.onDragEnd()">
              <app-vault-card
                [context]="card"
                [actionDisplay]="_controls().actionDisplay"
                [projectOptions]="projectOptions"
                [epicOptions]="epicOptions" />
            </div>
          }
        </app-kanban-column>

        <app-kanban-column
          label="Decomposed"
          [count]="cardsDecomposed().length"
          [dropEligible]="drag.isEligibleDropTarget('decomposed')"
          [dropActive]="drag.dropTarget() === 'decomposed'"
          emptyLabel="Nothing in draft"
          (dragover)="drag.onDragOver($event, 'decomposed')"
          (dragleave)="drag.onDragLeave('decomposed')"
          (drop)="onDrop($event, 'decomposed')">
          @for (card of cardsDecomposed(); track card.item.id) {
            <div class="kk-card-wrap"
              draggable="true"
              [class.kk-card-wrap--dragging]="drag.dragging() === card.item.id"
              (dragstart)="drag.onDragStart($event, card.item.id)"
              (dragend)="drag.onDragEnd()">
              <app-vault-card
                [context]="card"
                [actionDisplay]="_controls().actionDisplay"
                [projectOptions]="projectOptions"
                [epicOptions]="epicOptions" />
            </div>
          }
        </app-kanban-column>

        <app-kanban-column
          label="Ready"
          [count]="cardsReady().length"
          [dropEligible]="drag.isEligibleDropTarget('ready')"
          [dropActive]="drag.dropTarget() === 'ready'"
          emptyLabel="No ready items"
          (dragover)="drag.onDragOver($event, 'ready')"
          (dragleave)="drag.onDragLeave('ready')"
          (drop)="onDrop($event, 'ready')">
          @for (card of cardsReady(); track card.item.id) {
            <div class="kk-card-wrap"
              draggable="true"
              [class.kk-card-wrap--dragging]="drag.dragging() === card.item.id"
              (dragstart)="drag.onDragStart($event, card.item.id)"
              (dragend)="drag.onDragEnd()">
              <app-vault-card
                [context]="card"
                [actionDisplay]="_controls().actionDisplay"
                [projectOptions]="projectOptions"
                [epicOptions]="epicOptions" />
            </div>
          }
        </app-kanban-column>

      </div>
    </app-ui-section>
  `,
})
export class VaultCardKanbanSection {

  // ── Fixture options for inline backfill pickers ───────────────────────────

  readonly projectOptions: readonly Project[] = [
    { id: projectId('localshout'), display_name: 'LocalShout', description: '', status: 'active', kind: 'major', owner_actor_id: actorId('marvin'), criteria: null, repo_url: null, color_token: '#6b95d6', created_at: '2026-01-01T00:00:00Z', ...EMPTY_PROJECT_BRIEF },
    { id: projectId('hermes'),     display_name: 'Hermes',     description: '', status: 'active', kind: 'major', owner_actor_id: actorId('marvin'), criteria: null, repo_url: null, color_token: '#a878d6', created_at: '2026-01-01T00:00:00Z', ...EMPTY_PROJECT_BRIEF },
    { id: projectId('dashboard'),  display_name: 'Dashboard',  description: '', status: 'active', kind: 'major', owner_actor_id: actorId('marvin'), criteria: null, repo_url: null, color_token: '#7ac4a4', created_at: '2026-01-01T00:00:00Z', ...EMPTY_PROJECT_BRIEF },
    { id: projectId('personal'),   display_name: 'Personal',   description: '', status: 'active', kind: 'major', owner_actor_id: actorId('marvin'), criteria: null, repo_url: null, color_token: '#c4a47a', created_at: '2026-01-01T00:00:00Z', ...EMPTY_PROJECT_BRIEF },
  ];

  readonly epicOptions: readonly VaultItemType[] = [
    baseItem({ seq: 2350, title: 'Unify kanban card components',              is_epic: true, grooming_status: 'ready' }),
    baseItem({ seq: 2300, title: 'Phase B Postgres cutover',                  is_epic: true, grooming_status: 'ready' }),
    baseItem({ seq: 2280, title: 'Phase C · turn boris/ralph dispatch on',    is_epic: true, grooming_status: 'ready' }),
  ];

  // ── Controls state ────────────────────────────────────────────────────────

  protected readonly _controls = signal<ControlState>({
    priority:      null,
    assignee:      'marvin',
    ageHours:      6,
    daysInCol:     0,
    showProject:   true,
    showTags:      false,
    isEpic:        false,
    showQuestion:  false,
    sourceKind:    null,
    actionDisplay: 'icon+label',
  });

  // ── Card positions (mutable via drag-drop) ────────────────────────────────

  // Initialised from DEMO_CARDS; updated on each successful drop.
  private readonly positions = signal<Record<string, GroomingStatus>>(
    Object.fromEntries(DEMO_CARDS.map(s => [s.id, s.defaultStatus]))
  );

  // ── Drag state ────────────────────────────────────────────────────────────

  // Closes over `positions` so eligibility recomputes whenever the map mutates.
  readonly drag = createKanbanDragState<string, GroomingStatus>(
    id => this.positions()[id],
    'text/x-kanban-kk-id',
  );

  // ── Derived card contexts ─────────────────────────────────────────────────

  readonly allCards = computed<readonly GroomingCardContext[]>(() => {
    const ctrl = this._controls();
    const pos  = this.positions();
    return DEMO_CARDS.map(slot => this.buildCtx(slot, pos[slot.id] ?? slot.defaultStatus, ctrl));
  });

  readonly cardsUngroomed  = computed(() => this.allCards().filter(c => c.item.grooming_status === 'ungroomed'));
  readonly cardsClassified = computed(() => this.allCards().filter(c => c.item.grooming_status === 'classified'));
  readonly cardsDecomposed = computed(() => this.allCards().filter(c => c.item.grooming_status === 'decomposed'));
  readonly cardsReady      = computed(() => this.allCards().filter(c => c.item.grooming_status === 'ready'));

  // ── Drop handler ──────────────────────────────────────────────────────────

  onDrop(event: DragEvent, status: GroomingStatus): void {
    const id = this.drag.onDrop(event, status);
    if (id !== null) {
      this.positions.update(p => ({ ...p, [id]: status }));
    }
  }

  // ── Control setters ───────────────────────────────────────────────────────

  setCtrlPriority(e: Event): void {
    const raw = (e.target as HTMLSelectElement).value;
    const priority: Priority | null = raw === '' ? null : (Number(raw) as Priority);
    this._controls.update(c => ({ ...c, priority }));
  }

  setCtrlAssignee(e: Event): void {
    const raw = (e.target as HTMLSelectElement).value;
    const assignee = raw === '' ? null : raw as Exclude<ControlState['assignee'], null>;
    this._controls.update(c => ({ ...c, assignee }));
  }

  setCtrlSourceKind(e: Event): void {
    const raw = (e.target as HTMLSelectElement).value;
    const sourceKind: SourceKind | null = raw === '' ? null : raw as SourceKind;
    this._controls.update(c => ({ ...c, sourceKind }));
  }

  setCtrlActionDisplay(e: Event): void {
    const actionDisplay = (e.target as HTMLSelectElement).value as ControlState['actionDisplay'];
    this._controls.update(c => ({ ...c, actionDisplay }));
  }

  setCtrlAge(e: Event): void {
    const ageHours = Number((e.target as HTMLSelectElement).value);
    this._controls.update(c => ({ ...c, ageHours }));
  }

  setCtrlDaysInCol(e: Event): void {
    const daysInCol = Number((e.target as HTMLSelectElement).value);
    this._controls.update(c => ({ ...c, daysInCol }));
  }

  setCtrlShowProject(e: Event): void {
    const showProject = (e.target as HTMLInputElement).checked;
    this._controls.update(c => ({ ...c, showProject }));
  }

  setCtrlShowTags(e: Event): void {
    const showTags = (e.target as HTMLInputElement).checked;
    this._controls.update(c => ({ ...c, showTags }));
  }

  setCtrlIsEpic(e: Event): void {
    const isEpic = (e.target as HTMLInputElement).checked;
    this._controls.update(c => ({ ...c, isEpic }));
  }

  setCtrlShowQuestion(e: Event): void {
    const showQuestion = (e.target as HTMLInputElement).checked;
    this._controls.update(c => ({ ...c, showQuestion }));
  }

  // ── Context builder ───────────────────────────────────────────────────────

  private buildCtx(
    slot: DemoCardSlot,
    status: GroomingStatus,
    ctrl: ControlState,
  ): GroomingCardContext {
    const { priority, assignee, ageHours, daysInCol, showProject, showTags, isEpic, showQuestion, sourceKind } = ctrl;

    // Pick a project based on slot id to give variety when showProject is on.
    const projectBySlot: ProjectRef =
      slot.id === 'k4' || slot.id === 'k7' ? PROJ_JIMBO
      : slot.id === 'k3' || slot.id === 'k5' ? PROJ_HERMES
      : PROJ_LOCALSHOUT;

    // Resolved owner — null when unassigned so ownership === 'unassigned'.
    const owner = assignee ? actorId(assignee) : null;

    // Simulate a source URL for navigable source kinds.
    const sourceUrl: string | null = sourceKind === 'github'
      ? 'https://github.com/example/repo/issues/42'
      : sourceKind === 'pr-comment'
        ? 'https://github.com/example/repo/pull/7#issuecomment-1'
        : null;

    // Source label text for the identity row.
    const sourceText: string = sourceKind === 'github'     ? 'GitHub #42'
      : sourceKind === 'pr-comment'  ? 'via PR comment'
      : sourceKind === 'agent'       ? 'by @boris'
      : sourceKind === 'email'       ? 'via email'
      : sourceKind === 'url'         ? 'via url'
      : 'manual';

    return {
      kind: 'grooming',
      item: baseItem({
        id: vaultItemId(slot.id),
        seq: slot.seq,
        title: slot.title,
        assigned_to: owner,
        tags: showTags ? slot.defaultTags : [],
        grooming_status: status,
        manual_priority: priority,
        ai_priority: status === 'classified' ? 1 : null,
        ai_rationale: status === 'classified'
          ? 'Ranked by vault-classify based on blocked count and project priority.'
          : null,
        priority_confidence: status === 'classified' ? 0.8 : null,
        actionability: status === 'classified' ? 'clear' : null,
        acceptance_criteria: status === 'decomposed' ? DEMO_CRITERIA : [],
        is_epic: isEpic,
        created_at: ago(ageHours),
      }),
      project:            showProject ? projectBySlot : null,
      owner,
      openQuestion:       showQuestion ? DEMO_QUESTION : null,
      childRollup:        isEpic ? DEMO_ROLLUP : null,
      parentEpic:         null,
      lastActivityAt:     ago(ageHours / 2),
      daysInColumn:       daysInCol,
      source:             { text: sourceText, actorId: null },
      openQuestionsCount: showQuestion ? 1 : 0,
      sourceKind:         sourceKind ?? null,
      sourceUrl,
    };
  }
}
