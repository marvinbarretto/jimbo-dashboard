import { formatLondonTime } from '@shared/utils/datetime.utils';
import type { BriefingAnalysisData } from '@features/briefings/data-access/briefing.types';

/**
 * The day's shape, normalised out of whichever briefing schema the API happens
 * to have written.
 *
 * Three generations of briefing describe the same thing three ways —
 * `suggested_blocks` (v3's placeable blocks), `priorities` (v2's loose-timing
 * reframe), `day_plan` (v1's fixed schedule). The phone renders one list, so
 * the branching lives here where each generation's lead-line rule can be
 * asserted, rather than in a template where it can only be eyeballed.
 *
 * Read-only by design: there is no plan-acceptance endpoint today, so nothing
 * here carries an ack flag. See the plan's follow-ups.
 */

export interface ShapeBlock {
  /** Left-hand lead — a clock time when there is one, otherwise the constraint. */
  readonly lead: string;
  readonly title: string;
  /** Project/bucket and size, when the schema carries them. */
  readonly meta: string | null;
}

/** Below this a size is just "one block" and saying so is noise. */
const SIZE_WORTH_SAYING = 1;

function join(parts: readonly (string | null | undefined)[]): string | null {
  const kept = parts.filter((p): p is string => !!p && p.trim().length > 0);
  return kept.length ? kept.join(' · ') : null;
}

/**
 * v3 blocks carry a concrete `start` (ISO) that supersedes the fuzzy
 * `start_hint`. Zoned to London, never the device — the phone travels and a
 * block placed at 09:30 must not read as 10:30 abroad.
 */
function blockLead(start: string | undefined, hint: string | undefined, constraint: string): string {
  if (start) return formatLondonTime(start);
  if (hint) return hint;
  return constraint;
}

export function buildDayShape(analysis: BriefingAnalysisData | null | undefined): ShapeBlock[] {
  if (!analysis) return [];

  const blocks = analysis.suggested_blocks ?? [];
  if (blocks.length) {
    return blocks.map((b) => ({
      lead: blockLead(b.start, b.start_hint, b.constraint),
      title: b.title,
      meta: join([
        b.project ?? b.bucket,
        b.size_blocks > SIZE_WORTH_SAYING ? `${b.size_blocks} blocks` : null,
      ]),
    }));
  }

  const priorities = analysis.priorities ?? [];
  if (priorities.length) {
    return priorities.map((p) => ({
      lead: p.fixed_time ?? (p.deadline ? `by ${p.deadline}` : p.constraint),
      title: p.title,
      meta: p.bucket ?? null,
    }));
  }

  // v2 rows null out day_plan rather than sending an empty array, so this last
  // fallback has to survive a null the type doesn't admit to.
  return (analysis.day_plan ?? []).map((d) => ({
    lead: d.time,
    title: d.suggestion,
    meta: null,
  }));
}
