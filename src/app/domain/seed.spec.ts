import { SEED, VAULT_ITEM_IDS } from './seed';
import { computeReadiness, type OpenBlocker } from './vault/readiness';
import { skillNamespace } from './skills/skill';
import type { ActivityEvent, VaultActivityEvent, ProjectActivityEvent } from './activity/activity-event';
import { isVaultEvent, isProjectEvent } from './activity/activity-event';
import { GROOMING_STATUS_ORDER } from './vault/vault-item';

// Stress-test for the domain graph.
// Two jobs:
//   1. Referential integrity — every FK resolves to a real row.
//   2. Behaviour — readiness verdict matches narrative expectation per item.
// If either fails, the shapes drifted or the fixture went stale.

describe('domain seed', () => {
  // --- Indexes built once for all tests ---
  const actorIds         = new Set(SEED.actors.map(a => a.id));
  const skillIds         = new Set(SEED.skills.map(s => s.id));
  const projectIds       = new Set(SEED.projects.map(p => p.id));
  const vaultItemIds     = new Set(SEED.vault_items.map(v => v.id));
  const messageIds       = new Set(SEED.thread_messages.map(m => m.id));
  const modelIds         = new Set(SEED.models.map(m => m.id));

  describe('referential integrity', () => {
    it('actor_skills points at real actors and skills', () => {
      for (const link of SEED.actor_skills) {
        expect(actorIds, `actor ${link.actor_id}`).toContain(link.actor_id);
        expect(skillIds, `skill ${link.skill_id}`).toContain(link.skill_id);
      }
    });

    it('project owner_actor_id points at a real actor', () => {
      for (const project of SEED.projects) {
        expect(actorIds, `project ${project.id} owner`).toContain(project.owner_actor_id);
      }
    });

    it('vault_items.assigned_to points at a real actor (when set)', () => {
      for (const item of SEED.vault_items) {
        if (item.assigned_to) expect(actorIds).toContain(item.assigned_to);
      }
    });

    it('vault_items.parent_id points at a real vault item (when set)', () => {
      for (const item of SEED.vault_items) {
        if (item.parent_id) expect(vaultItemIds).toContain(item.parent_id);
      }
    });

    it('vault_item_projects FKs both resolve', () => {
      for (const link of SEED.vault_item_projects) {
        expect(vaultItemIds).toContain(link.vault_item_id);
        expect(projectIds).toContain(link.project_id);
      }
    });

    it('vault_item_dependencies FKs both resolve and refer to different items', () => {
      for (const dep of SEED.vault_item_dependencies) {
        expect(vaultItemIds).toContain(dep.blocker_id);
        expect(vaultItemIds).toContain(dep.blocked_id);
        expect(dep.blocker_id).not.toBe(dep.blocked_id);
      }
    });

    it('thread_messages FKs resolve and reply pointers stay self-consistent', () => {
      for (const msg of SEED.thread_messages) {
        expect(vaultItemIds).toContain(msg.vault_item_id);
        expect(actorIds).toContain(msg.author_actor_id);
        if (msg.in_reply_to) expect(messageIds).toContain(msg.in_reply_to);
        if (msg.answered_by) expect(messageIds).toContain(msg.answered_by);
      }
    });

    it('answered_by always points at an answer message', () => {
      const byId = new Map(SEED.thread_messages.map(m => [m.id, m]));
      for (const msg of SEED.thread_messages) {
        if (msg.answered_by) {
          const answer = byId.get(msg.answered_by);
          expect(answer?.kind).toBe('answer');
        }
      }
    });

    it('vault activity events resolve their FKs and discriminated payloads', () => {
      // Widen from the as-const tuple literal so narrowing works inside the loop.
      const all = SEED.activity_events as readonly ActivityEvent[];
      const vaultEvents: VaultActivityEvent[] = all.filter(isVaultEvent);
      for (const event of vaultEvents) {
        expect(actorIds).toContain(event.actor_id);
        expect(vaultItemIds).toContain(event.vault_item_id);

        if (event.type === 'assigned') {
          if (event.from_actor_id) expect(actorIds).toContain(event.from_actor_id);
          expect(actorIds).toContain(event.to_actor_id);
        }
        if (event.type === 'thread_message_posted') {
          expect(messageIds).toContain(event.message_id);
        }
      }
    });

    it('project activity events resolve their FKs and discriminated payloads', () => {
      const all = SEED.activity_events as readonly ActivityEvent[];
      const projectEvents: ProjectActivityEvent[] = all.filter(isProjectEvent);
      for (const event of projectEvents) {
        expect(actorIds).toContain(event.actor_id);
        expect(projectIds).toContain(event.project_id);

        if (event.type === 'project_owner_changed') {
          expect(actorIds).toContain(event.from_actor_id);
          expect(actorIds).toContain(event.to_actor_id);
        }
      }
    });

    it('every thread message has a paired thread_message_posted event', () => {
      const postedMessageIds = new Set(
        SEED.activity_events
          .filter(isVaultEvent)
          .filter(e => e.type === 'thread_message_posted')
          .map(e => e.type === 'thread_message_posted' ? e.message_id : null),
      );
      for (const msg of SEED.thread_messages) {
        expect(postedMessageIds, `message ${msg.id} missing posted event`).toContain(msg.id);
      }
    });

    it('attachments point at real thread messages', () => {
      for (const att of SEED.attachments) {
        expect(messageIds).toContain(att.thread_message_id);
      }
    });

    it('dispatch entries reference real items and executors', () => {
      // skill is a soft reference into hub/skills/ (filesystem registry); the
      // domain-level seed graph isn't the source of truth for skills, so we
      // don't assert d.skill resolves here. Filesystem gating happens in
      // jimbo-api at enqueue time.
      for (const d of SEED.dispatch_entries) {
        expect(vaultItemIds).toContain(d.task_id);
        expect(actorIds).toContain(d.executor);
      }
    });

    it('model_stack chain entries resolve to real models', () => {
      for (const stack of SEED.model_stacks) {
        for (const id of stack.metadata.chain) {
          expect(modelIds, `stack ${stack.id} -> model ${id}`).toContain(id);
        }
      }
    });

    it('every vault item has at least one project link', () => {
      const linkedItemIds = new Set(SEED.vault_item_projects.map(j => j.vault_item_id));
      for (const item of SEED.vault_items) {
        expect(linkedItemIds, `item ${item.seq} (${item.title.slice(0, 40)}) has no project`).toContain(item.id);
      }
    });

    it('parent_id (epic edge) resolves to a real vault item when set', () => {
      for (const item of SEED.vault_items) {
        if (item.parent_id) {
          expect(vaultItemIds, `item ${item.seq} parent_id`).toContain(item.parent_id);
          expect(item.parent_id).not.toBe(item.id); // a row cannot be its own parent
        }
      }
    });

    it('every grooming column has at least one fixture so kanban renders all six', () => {
      for (const status of GROOMING_STATUS_ORDER) {
        const count = SEED.vault_items.filter(v => v.grooming_status === status).length;
        expect(count, `column "${status}" is empty`).toBeGreaterThan(0);
      }
    });

    it('archived_at and completed_at are independent — both can be set or null', () => {
      // No assertion here beyond shape — the point of dropping `status` is that the
      // two timestamps are orthogonal facts. Done items can later be archived without
      // losing completion. This test exists to document the invariant.
      for (const item of SEED.vault_items) {
        // Each timestamp is either null or an ISO string. Nothing more.
        if (item.completed_at !== null) {
          expect(typeof item.completed_at).toBe('string');
        }
        if (item.archived_at !== null) {
          expect(typeof item.archived_at).toBe('string');
        }
      }
    });
  });

  describe('readiness verdicts match narrative', () => {
    function messagesFor(itemId: string) {
      return SEED.thread_messages.filter(m => m.vault_item_id === itemId);
    }

    function openBlockersFor(itemId: string): OpenBlocker[] {
      const byId = new Map(SEED.vault_items.map(v => [v.id, v]));
      return SEED.vault_item_dependencies
        .filter(d => d.blocked_id === itemId)
        .map(d => byId.get(d.blocker_id)!)
        // Open = blocker exists and isn't completed yet.
        .filter(b => b.completed_at === null)
        .map(b => ({ blocker_id: b.id, blocker_seq: b.seq, blocker_title: b.title }));
    }

    it('Item A (intake_rejected with open question) is blocked', () => {
      const item = SEED.vault_items.find(v => v.id === VAULT_ITEM_IDS.A)!;
      const r = computeReadiness(item, messagesFor(item.id), openBlockersFor(item.id));
      expect(r.verdict).toBe('blocked');
      expect(r.checks.find(c => c.key === 'open_questions')?.ok).toBe(false);
    });

    it('Item B (fully groomed) is ready', () => {
      const item = SEED.vault_items.find(v => v.id === VAULT_ITEM_IDS.B)!;
      const r = computeReadiness(item, messagesFor(item.id), openBlockersFor(item.id));
      expect(r.verdict).toBe('ready');
      expect(r.checks.every(c => c.ok)).toBe(true);
    });

    it('Item C (classified, blocked by A) surfaces unresolved_blockers', () => {
      const item = SEED.vault_items.find(v => v.id === VAULT_ITEM_IDS.C)!;
      const r = computeReadiness(item, messagesFor(item.id), openBlockersFor(item.id));
      expect(r.verdict).not.toBe('ready');
      expect(r.checks.find(c => c.key === 'unresolved_blockers')?.ok).toBe(false);
      // Question on C was answered — open_questions check should NOT appear.
      expect(r.checks.find(c => c.key === 'open_questions')).toBeUndefined();
    });

    it('Item D (done) is ready by every check', () => {
      const item = SEED.vault_items.find(v => v.id === VAULT_ITEM_IDS.D)!;
      const r = computeReadiness(item, messagesFor(item.id), openBlockersFor(item.id));
      expect(r.verdict).toBe('ready');
    });
  });
});
