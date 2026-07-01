// Mirrors jimbo-api/src/schemas/interrogate.ts SnapshotResponse — the payload
// behind GET /api/interrogate/snapshot ("Marvin's current self-model").
import type {
  InterrogateValue, InterrogatePriority, InterrogateGoal, InterrogateInterest,
  InterrogateExperiment, InterrogateNoGo, InterrogateTension, InterrogateOpenQuestion,
} from './interrogate-entity';
import type { ContextFile } from './context-file';

export interface InterrogateSnapshot {
  values: InterrogateValue[];
  priorities: InterrogatePriority[];
  goals: InterrogateGoal[];
  interests: InterrogateInterest[];
  experiments: InterrogateExperiment[];
  nogos: InterrogateNoGo[];
  tensions: InterrogateTension[];
  open_questions: InterrogateOpenQuestion[];
  context: Record<string, ContextFile>;
}
