// Mirrors jimbo-api/src/schemas/clarifications.ts — small, high-frequency
// anti-assumption questions Jimbo asks via Discord, answered whenever.
// Kept deliberately out of the interrogate self-model/snapshot; it's its own
// stream, rendered as a tab within the Picture page.
import type { ClarificationId } from '@domain/ids';

export type ClarificationKind = 'disambiguate' | 'validate' | 'followup' | 'ambient';
export type ClarificationSourceKind = 'vault' | 'google_task' | 'calendar' | 'model-gap';
export type ClarificationStatus = 'open' | 'answered' | 'expired' | 'dismissed';

// Mirrors jimbo-api/src/services/clarification-interpret.ts InterpretedAction —
// the LLM interpreter's routing of an answer into a concrete write. Kept in
// sync by hand; field names match exactly what the interpreter returns.
export type InterpretedAction =
  | { action: 'update_vault_note'; note_id: string; append_body: string }
  | { action: 'archive_vault_note'; note_id: string; reason: string }
  | { action: 'create_task'; title: string; body: string }
  | { action: 'ephemeral_context'; content: string; timeframe: string | null; expires_at_days: number | null }
  | { action: 'noop'; reason: string };

export interface Clarification {
  id: ClarificationId;
  content: string;
  kind: ClarificationKind;
  source_kind: ClarificationSourceKind;
  source_ref: string | null;
  status: ClarificationStatus;
  discord_message_id: string | null;
  asked_at: string;
  answered_at: string | null;
  answer_text: string | null;
  interpreted_action: InterpretedAction | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnswerClarificationResponse {
  clarification: Clarification;
  echo: string;
}
