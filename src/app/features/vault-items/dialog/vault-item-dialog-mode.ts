import type { VaultItem } from '@domain/vault/vault-item';
import type { Project } from '@domain/projects';
import type { Actor } from '@domain/actors';
import type { VaultItemId } from '@domain/ids';

/**
 * Pre-save scratch for a brand-new item — nothing has hit the API yet.
 * Mirrors the inputs the unified dialog accepts in Draft mode.
 */
export interface DraftPayload {
  readonly title: string;
  readonly body: string;
  readonly tags: readonly string[];
  readonly projects: readonly Project[];
  readonly assignee: Actor | null;
  readonly related: readonly RelatedRef[];
  readonly is_epic: boolean;
  readonly github_url: string | null;
}

export interface RelatedRef {
  readonly id: VaultItemId;
  readonly title: string;
  readonly seq: number | null;
}

export const emptyDraft: DraftPayload = {
  title: '',
  body: '',
  tags: [],
  projects: [],
  assignee: null,
  related: [],
  is_epic: false,
  github_url: null,
};

/**
 * "Fresh" items get the collapsed-by-default layout (no body/activity/thread
 * sections expanded); "mature" items get the full layout. Driven by activity
 * — an item with zero thread messages and zero activity events is fresh,
 * regardless of grooming_status. Touching it (anyone posting, any state
 * change) makes it mature.
 */
export type ItemStage = 'fresh' | 'mature';

export function stageFor(threadMessageCount: number, activityEventCount: number): ItemStage {
  return threadMessageCount === 0 && activityEventCount === 0 ? 'fresh' : 'mature';
}

/**
 * Discriminated union driving the dialog's render. Draft mode is the
 * pre-save state (was `CaptureDialog`); Item mode is the post-save state
 * (was `VaultItemDetailDialog`). The same component handles both and
 * morphs Draft → Item on save.
 */
export type DialogMode =
  | { readonly kind: 'draft'; readonly payload: DraftPayload }
  | { readonly kind: 'item'; readonly seq: number; readonly stage: ItemStage };

export const isDraft = (m: DialogMode): m is Extract<DialogMode, { kind: 'draft' }> =>
  m.kind === 'draft';

export const isItem = (m: DialogMode): m is Extract<DialogMode, { kind: 'item' }> =>
  m.kind === 'item';

/**
 * What gets passed via DIALOG_DATA when the dialog opens. The internal
 * DialogMode adds the resolved stage + draft payload after construction.
 *
 * `destination: 'manual'` signals that the created item should land in the
 * execution board's manual track (grooming_status='ready', source='board')
 * rather than the default grooming inbox (grooming_status='ungroomed').
 */
export type VaultItemDialogData =
  | { readonly kind: 'draft'; readonly destination?: 'manual' }
  | { readonly kind: 'item'; readonly seq: number };

export function initialMode(data: VaultItemDialogData): DialogMode {
  if (data.kind === 'item') {
    // Stage starts pessimistic at 'mature' — the content component refines
    // it once thread/activity counts resolve. Avoids a flicker where a real
    // mature item momentarily renders with everything collapsed.
    return { kind: 'item', seq: data.seq, stage: 'mature' };
  }
  return { kind: 'draft', payload: emptyDraft };
}

/**
 * True when the draft has *any* user-entered content. Drives the
 * "discard with toast" warning on Esc.
 */
export function isDraftDirty(d: DraftPayload): boolean {
  return d.title.trim().length > 0
    || d.body.trim().length > 0
    || d.tags.length > 0
    || d.projects.length > 0
    || d.assignee !== null
    || d.related.length > 0;
}

/**
 * Convenience for code that holds a VaultItem (instead of separate counts).
 * Currently delegates to `stageFor` using the activity/thread arrays the
 * caller already loaded.
 */
export function stageForItem(_item: VaultItem, threadMessages: readonly unknown[], events: readonly unknown[]): ItemStage {
  return stageFor(threadMessages.length, events.length);
}
