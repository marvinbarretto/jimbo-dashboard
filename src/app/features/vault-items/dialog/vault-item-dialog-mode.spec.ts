import { describe, it, expect } from 'vitest';
import {
  emptyDraft,
  initialMode,
  isDraft,
  isDraftDirty,
  isItem,
  stageFor,
  type DialogMode,
  type DraftPayload,
} from './vault-item-dialog-mode';
import { actorId, projectId, vaultItemId , wellKnownActorId} from '@domain/ids';
import type { Actor } from '@domain/actors';
import type { Project } from '@domain/projects';

const fakeActor: Actor = {
  id: wellKnownActorId('marvin'),
  display_name: 'Marvin',
  kind: 'human',
  is_active: true,
  // The Actor type only requires the fields above for our purposes here.
} as unknown as Actor;

const fakeProject: Project = {
  id: projectId('hermes'),
  display_name: 'Hermes',
  is_active: true,
  short_code: null,
} as unknown as Project;

describe('stageFor', () => {
  it('returns fresh when both counts are zero', () => {
    expect(stageFor(0, 0)).toBe('fresh');
  });

  it('returns mature once any thread message exists', () => {
    expect(stageFor(1, 0)).toBe('mature');
  });

  it('returns mature once any activity event exists', () => {
    expect(stageFor(0, 1)).toBe('mature');
  });

  it('returns mature when both exist', () => {
    expect(stageFor(3, 5)).toBe('mature');
  });
});

describe('isDraft / isItem narrowing', () => {
  it('narrows draft mode', () => {
    const m: DialogMode = { kind: 'draft', payload: emptyDraft };
    expect(isDraft(m)).toBe(true);
    expect(isItem(m)).toBe(false);
    if (isDraft(m)) {
      // type-level: payload accessible without cast
      expect(m.payload.title).toBe('');
    }
  });

  it('narrows item mode', () => {
    const m: DialogMode = { kind: 'item', seq: 42, stage: 'mature' };
    expect(isItem(m)).toBe(true);
    expect(isDraft(m)).toBe(false);
    if (isItem(m)) {
      expect(m.seq).toBe(42);
      expect(m.stage).toBe('mature');
    }
  });
});

describe('initialMode', () => {
  it('builds a draft mode from { kind: "draft" }', () => {
    const m = initialMode({ kind: 'draft' });
    expect(m.kind).toBe('draft');
    if (isDraft(m)) expect(m.payload).toEqual(emptyDraft);
  });

  it('builds an item mode (mature, pessimistic) from { kind: "item", seq }', () => {
    const m = initialMode({ kind: 'item', seq: 7 });
    expect(m.kind).toBe('item');
    if (isItem(m)) {
      expect(m.seq).toBe(7);
      // Pessimistic default — refined to 'fresh' by the content component
      // once activity/thread counts resolve to zero.
      expect(m.stage).toBe('mature');
    }
  });
});

describe('isDraftDirty', () => {
  it('false for empty draft', () => {
    expect(isDraftDirty(emptyDraft)).toBe(false);
  });

  it('false for whitespace-only title and body', () => {
    const d: DraftPayload = { ...emptyDraft, title: '   ', body: '\n\t' };
    expect(isDraftDirty(d)).toBe(false);
  });

  it('true once title has content', () => {
    expect(isDraftDirty({ ...emptyDraft, title: 'fix bug' })).toBe(true);
  });

  it('true once body has content', () => {
    expect(isDraftDirty({ ...emptyDraft, body: 'notes' })).toBe(true);
  });

  it('true with at least one tag', () => {
    expect(isDraftDirty({ ...emptyDraft, tags: ['x'] })).toBe(true);
  });

  it('true with at least one project', () => {
    expect(isDraftDirty({ ...emptyDraft, projects: [fakeProject] })).toBe(true);
  });

  it('true once an assignee is set', () => {
    expect(isDraftDirty({ ...emptyDraft, assignee: fakeActor })).toBe(true);
  });

  it('true once a related item is attached', () => {
    expect(isDraftDirty({
      ...emptyDraft,
      related: [{ id: vaultItemId('x'), title: 't', seq: 1 }],
    })).toBe(true);
  });
});
