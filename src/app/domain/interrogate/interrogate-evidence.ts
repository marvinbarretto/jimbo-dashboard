// Mirrors jimbo-api/src/schemas/interrogate.ts EvidenceSchema — the provenance
// trail for a belief entity. `source_kind: 'manual'` + `stance` is how a
// dashboard-authored correction gets recorded (see BeliefFeedbackComposer).
import type { InterrogateEntityId } from '@domain/ids';
import type { InterrogateEntityType } from './interrogate-entity';

export type EvidenceSourceKind = 'journal' | 'vault' | 'task' | 'calendar' | 'answer' | 'manual';
export type EvidenceStance = 'supports' | 'contradicts';

export interface InterrogateEvidence {
  id: number;
  entity_type: InterrogateEntityType;
  entity_id: InterrogateEntityId;
  source_kind: EvidenceSourceKind;
  source_id: string | null;
  stance: EvidenceStance;
  weight: number;
  snippet: string | null;
  discovered_at: string;
  discovered_via_session_id: string | null;
}
