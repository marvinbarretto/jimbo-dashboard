/**
 * Ranks which epic a loose item most plausibly belongs under.
 *
 * Adoption was never actually possible in the UI — the only parent control was
 * a raw UUID text box — so 172 active tasks sit with no epic and nothing on
 * their detail view answers "why are we doing this". Scoring alone doesn't file
 * anything; it orders the picker so a human answers in a glance instead of
 * reading every epic title.
 *
 * Deliberately dumb and explainable. A shared tag is curated by someone, a
 * shared title word is incidental, so tags weigh double — and `reasons` is
 * returned so the UI can show WHY a candidate ranked, rather than a bare number
 * the operator has to trust.
 */
import type { VaultItem } from './vault-item';

const TAG_WEIGHT = 2;
const WORD_WEIGHT = 1;

/**
 * Tags carrying a date are provenance, not topic — `session-2026-07-31` marks
 * when something was captured, not what it's about. Scoring on them makes every
 * item from one session look related to every other, which is exactly the false
 * confidence that would file a task under the wrong epic. Observed inflating
 * real candidates by 2 points before this filter existed.
 */
const PROVENANCE_TAG = /\d{4}-\d{2}-\d{2}/;

function topicTags(tags: readonly string[]): Set<string> {
  return new Set(tags.filter(t => !PROVENANCE_TAG.test(t)));
}

/** Words that co-occur across unrelated vault titles and only add noise. */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'is', 'it', 'as',
  'with', 'add', 'fix', 'make', 'use', 'when', 'that', 'this', 'from', 'into',
  'epic', 'wip', 'todo',
]);

/** The minimum an item needs to be scored — the wire format and VaultItem both
 *  satisfy it, so the report and the UI picker rank identically. */
export type Scorable = Pick<VaultItem, 'title' | 'tags'>;

/** Epics additionally need a seq, for the stable tie-break. */
export type ScorableEpic = Scorable & Pick<VaultItem, 'seq'>;

export type EpicCandidate<E extends ScorableEpic = VaultItem> = {
  readonly epic: E;
  readonly score: number;
  /** Human-readable basis for the score, most significant first. */
  readonly reasons: readonly string[];
};

/** Title words worth comparing: >2 chars, not a stop word, punctuation stripped. */
export function titleTokens(title: string): ReadonlySet<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter(t => t.length > 2 && !STOP_WORDS.has(t)),
  );
}

function intersect(a: ReadonlySet<string>, b: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const v of a) if (b.has(v)) out.push(v);
  return out;
}

/**
 * @param item The loose item looking for a parent.
 * @param epic A candidate epic — caller must have already scoped these to the
 *   item's own project. A cross-project parent is a worse answer to "why" than
 *   no parent, so this never sees one.
 * @returns Score and the shared tags/words behind it. Score 0 = no signal.
 */
export function scoreEpicCandidate<E extends ScorableEpic>(
  item: Scorable,
  epic: E,
): EpicCandidate<E> {
  const sharedTags = intersect(topicTags(item.tags), topicTags(epic.tags));
  const sharedWords = intersect(titleTokens(item.title), titleTokens(epic.title));

  const reasons: string[] = [];
  if (sharedTags.length) reasons.push(`shares ${sharedTags.map(t => `#${t}`).join(' ')}`);
  if (sharedWords.length) reasons.push(`title: ${sharedWords.slice(0, 3).join(', ')}`);

  return {
    epic,
    score: sharedTags.length * TAG_WEIGHT + sharedWords.length * WORD_WEIGHT,
    reasons,
  };
}

/**
 * Ranks candidate epics for one loose item, best first.
 *
 * @param item The item needing a parent.
 * @param epics Candidate epics, already scoped to the item's project.
 * @param limit Max candidates to return.
 * @returns Only candidates with a non-zero score. An empty array is a real
 *   answer — it means nothing fits, and unparented is the honest outcome.
 */
export function rankEpicCandidates<E extends ScorableEpic>(
  item: Scorable,
  epics: readonly E[],
  limit = 3,
): EpicCandidate<E>[] {
  return epics
    .map(e => scoreEpicCandidate(item, e))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score || a.epic.seq - b.epic.seq)
    .slice(0, limit);
}
