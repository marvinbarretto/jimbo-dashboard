import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProjectRightNowSection, type DispatchTask } from './project-right-now-section';
import type { VaultItem } from '@domain/vault/vault-item';
import { vaultItemId } from '@domain/ids';

function makeItem(overrides: Partial<VaultItem> = {}): VaultItem {
  return {
    id: vaultItemId('11111111-1111-1111-1111-111111111111'),
    seq: 1,
    title: 'Set up DNS',
    body: '',
    type: 'task',
    category: null,
    assigned_to: null,
    tags: [],
    acceptance_criteria: [],
    suggested_skills: null,
    route: 'unrouted',
    grooming_status: 'classified',
    ai_priority: null,
    manual_priority: null,
    ai_rationale: null,
    priority_confidence: null,
    actionability: null,
    parent_id: null,
    is_epic: false,
    archived_at: null,
    due_at: null,
    completed_at: null,
    source: null,
    created_at: '2025-01-02T00:00:00Z',
    primary_project_id: 'localshout',
    ...overrides,
  };
}

function makeTask(overrides: Partial<DispatchTask> = {}): DispatchTask {
  return {
    id: 1,
    task_id: 'note_a',
    task_title: 'Fix the schedule filter',
    task_seq: 5296,
    status: 'running',
    executor: 'boris',
    skill: 'code/pr-from-issue',
    flow: 'commission',
    proposed_at: null,
    started_at: null,
    approved_at: null,
    result_summary: null,
    ...overrides,
  };
}

describe('ProjectRightNowSection', () => {
  let fixture: ComponentFixture<ProjectRightNowSection>;
  let component: ProjectRightNowSection;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectRightNowSection],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectRightNowSection);
    component = fixture.componentInstance;
  });

  // Inputs only, no view render. Signals resolve on read, and jsdom's CSS
  // parser chokes on VaultChip's `border: 3px solid var(--proj-tint, …)`
  // shorthand — rendering here would be testing jsdom, not this panel.
  async function set(inputs: Record<string, unknown>) {
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    await Promise.resolve();
  }

  it('reports five figures in rank order', async () => {
    await set({});
    expect(component.figures().map(f => f.key))
      .toEqual(['attention', 'proposed', 'inflight', 'beliefs', 'unrouted']);
  });

  // The panel claimed "nothing is waiting on you here" while 73 unrouted items
  // sat in a table lower down the same page. Routing is a decision only the
  // operator can make, so an unrouted pile defeats all-clear.
  it('does not claim all clear while items are unrouted', async () => {
    await set({ unroutedItems: 73 });
    expect(component.figures().find(f => f.key === 'unrouted')!.count).toBe(73);
    expect(component.allClear()).toBe(false);
    expect(component.meta()).toBe('73 unrouted');
  });

  // The whole point of this panel over the old stat tiles: a zero that came
  // back from a real read is an all-clear; a zero from a read that never
  // answered is not, and the two must not look the same.
  it('a dark dispatch read reads as unmeasured, never as zero', async () => {
    await set({ dispatchUnmeasured: true });
    const byKey = new Map(component.figures().map(f => [f.key, f]));
    expect(byKey.get('proposed')!.unmeasured).toBe(true);
    expect(byKey.get('inflight')!.unmeasured).toBe(true);
    // Attention comes off vault rows already in memory — no read to go dark.
    expect(byKey.get('attention')!.unmeasured).toBe(false);
    expect(component.anyUnmeasured()).toBe(true);
    expect(component.allClear()).toBe(false);
  });

  it('claims all clear only when every strand answered and was empty', async () => {
    await set({});
    expect(component.allClear()).toBe(true);

    await set({ proposedTasks: [makeTask({ status: 'proposed' })] });
    expect(component.allClear()).toBe(false);
  });

  it('does not claim all clear while a proposal read is outstanding', async () => {
    await set({ proposalsUnmeasured: true });
    expect(component.allClear()).toBe(false);
  });

  it('flags the attention figure and heads the section with its count', async () => {
    await set({ attentionItems: [makeItem({ due_at: '2020-01-01T00:00:00Z' })] });
    const attention = component.figures().find(f => f.key === 'attention')!;
    expect(attention.count).toBe(1);
    expect(attention.alert).toBe(true);
    expect(component.meta()).toBe('1 needing a decision');
  });

  it('leaves the section header bare when nothing needs a decision', async () => {
    await set({ inFlightTasks: [makeTask()] });
    expect(component.meta()).toBeNull();
  });

  it('recognises system-flagged assertion items', async () => {
    await set({});
    expect(component.isFlagged(makeItem({ type: 'assertion' as VaultItem['type'] }))).toBe(true);
    expect(component.isFlagged(makeItem())).toBe(false);
  });

  it('dates a dispatch by the most advanced timestamp it has', async () => {
    await set({});
    expect(component.taskWhen(makeTask({ proposed_at: 'p', approved_at: 'a', started_at: 's' }))).toBe('s');
    expect(component.taskWhen(makeTask({ proposed_at: 'p', approved_at: 'a' }))).toBe('a');
    expect(component.taskWhen(makeTask({ proposed_at: 'p' }))).toBe('p');
    expect(component.taskWhen(makeTask())).toBeNull();
  });
});
