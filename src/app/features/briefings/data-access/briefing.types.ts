// Mirrors BriefingAnalysisSchema from jimbo-api/src/schemas/briefing.ts. The
// dashboard has no generated client, so features mirror the API contract they
// consume (same pattern as briefing-detail's old inline copy and EmailReport).

export type BriefingRating = 'bad' | 'ok' | 'good' | 'great';

export interface DayPlanEntry { time: string; suggestion: string; source: string; reasoning: string; }
export interface EmailHighlight { source: string; headline: string; editorial: string; links: string[]; }
export interface Surprise { fact: string; strategy: string; }
export interface VaultTaskEntry { title: string; priority: number; actionability: string; note: string; provenance?: string; }

// ── v2 sections (schema_version 2 — the loose-timing reframe) ──────

export type BlockConstraint = 'daytime' | 'anytime' | 'fixed';
export type WeekTrackingStatus = 'on-track' | 'at-risk' | 'off-track' | 'done';

export interface PriorityEntry {
  title: string;
  reasoning: string;
  constraint: BlockConstraint;
  fixed_time?: string;
  deadline?: string;
  deadline_confidence?: 'hard' | 'ambition';
  bucket?: string;
}

export interface ReviewLine { area: string; note: string; }
export interface WeekTrackingEntry { intention: string; status: WeekTrackingStatus; note?: string; }
export interface OpenQuestion {
  question: string;
  gates?: string;
  // Present when the skill filed this as a clarification — makes it
  // answerable inline on the briefing page.
  clarification_id?: string;
  // The ref the skill filed (or would have filed) this under. Present on every
  // real question even when the cap blocked the file, so it stays answerable
  // in place via file-on-answer. Absent on the "queue is full" notice, which
  // stays display-only.
  source_ref?: string;
  options?: string[];
}
export interface Insight { fact: string; strategy?: string; }
export interface OpportunityThreat { kind: 'opportunity' | 'threat'; note: string; action?: string; }

export interface SuggestedBlock {
  title: string;
  size_blocks: number;
  constraint: BlockConstraint;
  start_hint?: string;
  bucket?: string;
  project?: string;
  // When the block represents a real vault task: its seq. Lets the dashboard
  // render a first-class block-card and pencil it round-trippably.
  vault_seq?: number;
  // Concrete best-guess start (ISO 8601) — supersedes start_hint for placement.
  start?: string;
}

export interface BriefingAnalysisData {
  day_plan: DayPlanEntry[];
  email_highlights: EmailHighlight[];
  surprise: Surprise | null;
  vault_tasks: VaultTaskEntry[];
  schema_version?: number;
  yesterday_review?: ReviewLine[];
  week_tracking?: WeekTrackingEntry[];
  priorities?: PriorityEntry[];
  open_questions?: OpenQuestion[];
  insights?: Insight[];
  opportunities_threats?: OpportunityThreat[];
  suggested_blocks?: SuggestedBlock[];
  health_status?: string;
}

export interface BriefingAnalysis {
  id: number;
  session: string;
  model: string;
  generated_at: string;
  analysis: BriefingAnalysisData;
  user_rating: number | null;
  rating: BriefingRating | null;
  rating_note: string | null;
  rated_at: string | null;
  created_at: string;
}

// Display order is best→worst (how the control reads left→right). The numeric
// score lets the archive derive a quality trend without the API storing one.
export const RATING_OPTIONS: ReadonlyArray<{ value: BriefingRating; label: string; score: number }> = [
  { value: 'great', label: 'Great', score: 4 },
  { value: 'good', label: 'Good', score: 3 },
  { value: 'ok', label: 'OK', score: 2 },
  { value: 'bad', label: 'Bad', score: 1 },
];

export function ratingScore(rating: BriefingRating | null): number | null {
  return RATING_OPTIONS.find(o => o.value === rating)?.score ?? null;
}
