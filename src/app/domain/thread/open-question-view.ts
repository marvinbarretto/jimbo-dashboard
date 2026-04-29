import type { ActorId, ThreadMessageId, VaultItemId } from '../ids';

export interface OpenQuestionView {
  id:                         ThreadMessageId;
  vault_item_id:              VaultItemId;
  vault_item_seq:             number;
  vault_item_title:           string;
  vault_item_grooming_status: string;
  vault_item_assigned_to:     ActorId | null;
  author_actor_id:            ActorId;
  kind:                       'question';
  body:                       string;
  in_reply_to:                ThreadMessageId | null;
  answered_by:                null;
  created_at:                 string;
  age_days:                   number;
}
