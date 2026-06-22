// Mirrors BriefingAnalysisSchema from jimbo-api/src/schemas/briefing.ts. The
// dashboard has no generated client, so features mirror the API contract they
// consume (same pattern as briefing-detail's old inline copy and EmailReport).

export type BriefingRating = 'bad' | 'ok' | 'good' | 'great';

export interface DayPlanEntry { time: string; suggestion: string; source: string; reasoning: string; }
export interface EmailHighlight { source: string; headline: string; editorial: string; links: string[]; }
export interface Surprise { fact: string; strategy: string; }
export interface VaultTaskEntry { title: string; priority: number; actionability: string; note: string; }

export interface BriefingAnalysis {
  id: number;
  session: string;
  model: string;
  generated_at: string;
  analysis: {
    day_plan: DayPlanEntry[];
    email_highlights: EmailHighlight[];
    surprise: Surprise | null;
    vault_tasks: VaultTaskEntry[];
  };
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
