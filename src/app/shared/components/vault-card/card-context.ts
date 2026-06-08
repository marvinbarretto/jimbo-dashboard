import type { VaultItem, GroomingStatus, SourceKind } from '@domain/vault';
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
  // null = unassigned. Boards must NOT fall back to CURRENT_ACTOR_ID — that
  // masks the real state and breaks "mine vs theirs vs unassigned" styling.
  readonly owner:              ActorId | null;
  readonly openQuestion:       ThreadMessage | null;
  readonly childRollup:        readonly ChildStatus[] | null;
  readonly parentEpic:         ParentEpicRef | null;
  readonly lastActivityAt:     string | null;
  readonly daysInColumn:       number;
  readonly source:             SourceLabel | null;
  readonly openQuestionsCount: number;
  // Raw source discriminator + URL — drive GH badge and source-class CSS modifier.
  // Kept separate from SourceLabel (which is display text) so the card can act
  // on the machine-readable kind without re-parsing formatted text.
  readonly sourceKind:         SourceKind | null;
  readonly sourceUrl:          string | null;
}

// Where the vault item came from — frozen at creation, item-level. Distinct
// from the dispatch's (actor, model, skill) signature which is per-run.
// `parentSeq` is set when this item was spawned by another (e.g. auto-decomposed
// from an epic) so the chip can link back.
export type GenesisKind = 'manual' | 'auto' | 'github' | 'external';

export interface Genesis {
  readonly kind:       GenesisKind;
  readonly label:      string;
  readonly parentSeq?: number | null;
}

export interface DispatchCardContext {
  readonly kind:             'dispatch';
  readonly entry:            DispatchQueueEntry;
  readonly item:             VaultItem | null;
  readonly project:          ProjectRef | null;
  readonly owner:            ActorId | null;
  readonly skillDisplayName: string | null;
  readonly parentEpic:       ParentEpicRef | null;
  // The model the executor picked for this run. Lives on the activity event
  // (per actors README — "Boris is not Sonnet 4.6"), so it's only known once
  // the run is in flight or done. Null until then.
  readonly modelId:          string | null;
  // How the vault item came to exist. Item-level, not run-level.
  readonly genesis:          Genesis | null;
}

export interface ManualCardContext {
  readonly kind:           'manual';
  readonly item:           VaultItem;
  readonly project:        ProjectRef | null;
  readonly owner:          ActorId | null;
  readonly parentEpic:     ParentEpicRef | null;
  readonly source:         SourceLabel | null;
  readonly lastActivityAt: string | null;
  readonly sourceKind:     SourceKind | null;
  readonly sourceUrl:      string | null;
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
