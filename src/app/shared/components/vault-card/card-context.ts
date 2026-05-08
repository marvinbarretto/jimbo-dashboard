import type { VaultItem, GroomingStatus } from '@domain/vault';
import type { DispatchQueueEntry } from '@domain/dispatch';
import type { ThreadMessage } from '@domain/thread';
import type { ActorId } from '@domain/ids';
import type { ChildStatus } from '@shared/components/epic-rollup/epic-rollup';

export type { ChildStatus } from '@shared/components/epic-rollup/epic-rollup';

export interface ProjectRef {
  readonly id:           string;
  readonly display_name: string;
  readonly color_token:  string | null;
}

// Pre-formatted source attribution. Board resolves the wording so the card
// doesn't need to know about the Source discriminated union shape.
export interface SourceLabel {
  readonly text:    string;
  readonly actorId: ActorId | null;
}

export interface ParentEpicRef {
  readonly seq:   number;
  readonly title: string;
}

export interface GroomingCardContext {
  readonly kind:               'grooming';
  readonly item:               VaultItem;
  readonly project:            ProjectRef | null;
  readonly owner:              ActorId;
  readonly openQuestion:       ThreadMessage | null;
  readonly childRollup:        readonly ChildStatus[] | null;
  readonly parentEpic:         ParentEpicRef | null;
  readonly lastActivityAt:     string | null;
  readonly daysInColumn:       number;
  readonly source:             SourceLabel | null;
  readonly openQuestionsCount: number;
}

export interface DispatchCardContext {
  readonly kind:             'dispatch';
  readonly entry:            DispatchQueueEntry;
  readonly item:             VaultItem | null;
  readonly project:          ProjectRef | null;
  readonly owner:            ActorId | null;
  readonly skillDisplayName: string | null;
  readonly parentEpic:       ParentEpicRef | null;
}

export interface ManualCardContext {
  readonly kind:           'manual';
  readonly item:           VaultItem;
  readonly project:        ProjectRef | null;
  readonly owner:          ActorId;
  readonly parentEpic:     ParentEpicRef | null;
  readonly source:         SourceLabel | null;
  readonly lastActivityAt: string | null;
}

export type CardContext = GroomingCardContext | DispatchCardContext | ManualCardContext;

export const isEpicContext = (ctx: CardContext): boolean =>
  ctx.kind !== 'dispatch' && ctx.item.is_epic;

// Helpers for the grooming card to figure out which callout / action set
// applies to the current item state.
export type GroomingCalloutKind = 'question' | 'rework' | 'draft' | 'rationale' | null;

export function calloutKindFor(ctx: GroomingCardContext): GroomingCalloutKind {
  const status: GroomingStatus = ctx.item.grooming_status;
  if (ctx.openQuestion && status === 'intake_rejected') return 'question';
  if (status === 'needs_rework') return 'rework';
  if (status === 'decomposed')   return 'draft';
  if (status === 'classified' && ctx.item.ai_rationale) return 'rationale';
  return null;
}
