import type { OpenQuestionView } from '../thread';
import type { Handback, ReviewWaiting } from './awaiting';

/**
 * One queue, not two. A question and a handback are both "an agent is stalled
 * behind you"; splitting them into separate lists would make the operator scan
 * twice and would bury whichever list happened to be second.
 */
export type AwaitingRow =
  | { readonly kind: 'question'; readonly key: string; readonly at: string; readonly question: OpenQuestionView }
  | { readonly kind: 'handback'; readonly key: string; readonly at: string; readonly handback: Handback }
  | { readonly kind: 'review';   readonly key: string; readonly at: string; readonly review: ReviewWaiting };

/**
 * Interleave handbacks and open questions, newest first.
 *
 * A note can appear as both — a handback raised BECAUSE a question is pending
 * is one event with two records. The question wins, because it carries the
 * answer affordance and the handback row would only offer "give it back",
 * which is the wrong move while the agent is waiting on an answer.
 */
export function mergeAwaitingRows(
  handbacks: readonly Handback[],
  questions: readonly OpenQuestionView[],
  reviews: readonly ReviewWaiting[] = [],
): AwaitingRow[] {
  const questioned = new Set(questions.map(q => q.vault_item_id as string));
  // Finished work outranks a handback on the same note: "accept this" is a
  // later and more actionable state than "an agent gave this back".
  const reviewed = new Set(reviews.map(r => r.id));

  const rows: AwaitingRow[] = [
    ...questions.map(q => ({
      kind: 'question' as const, key: `q:${q.id}`, at: q.created_at, question: q,
    })),
    ...reviews.map(r => ({
      // completedAt is null on some older rows; epoch sorts those last rather
      // than letting an Invalid Date throw them to the top.
      kind: 'review' as const, key: `r:${r.id}`,
      at: r.completedAt ?? '1970-01-01T00:00:00.000Z', review: r,
    })),
    ...handbacks
      .filter(h => !questioned.has(h.note_id as string) && !reviewed.has(h.note_id as string))
      .map(h => ({
        kind: 'handback' as const, key: `h:${h.activity_id}`, at: h.ts, handback: h,
      })),
  ];

  return rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
