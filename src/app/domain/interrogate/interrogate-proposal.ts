// Mirrors jimbo-api/src/schemas/interrogate.ts ProposalSchema — an
// AI-suggested change to a belief entity awaiting accept/reject/edit.
// Proposals require a session_id (created by /interrogate skill sessions),
// so the dashboard can only decide pending ones, not author new ones.
import type { InterrogateEntityType } from './interrogate-entity';

export type ProposalAction = 'create' | 'update' | 'archive' | 'adjust_confidence';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'edited';

export interface InterrogateProposal {
  id: number;
  session_id: string;
  entity_type: InterrogateEntityType;
  entity_id: string | null;
  action: ProposalAction;
  payload: Record<string, unknown>;
  confidence: number;
  rationale: string | null;
  status: ProposalStatus;
  decided_at: string | null;
  created_at: string;
}

export type ProposalDecision = 'accept' | 'reject' | 'edit';
