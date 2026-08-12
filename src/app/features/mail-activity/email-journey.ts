/**
 * Normalise `email_reports.analysis` into a renderable journey.
 *
 * The column is unvalidated jsonb with two writers and two shapes observed in
 * production (2026-08-12):
 *  - deep  — `kipper-email`, the M4's hourly sweep: summary, content_type,
 *            entities, events, deadlines, key_asks, plus followed links with
 *            screenshots;
 *  - triage — `email-processor`, a 12-hourly Hermes cron on the VPS:
 *            {score, summary, content_type} only.
 *
 * The shape inferred here is a rendering decision and stays a fallback. The
 * authoritative answer is `analysis_writer`, recorded at ingest since
 * 2026-08-12 — prefer it whenever the page needs to NAME the writer, and only
 * fall back to shape for rows that predate attribution.
 * Older rows and error paths have nothing at all. Every field is optional
 * here so the page can state what's absent instead of rendering blanks —
 * absence is a finding, not a styling problem.
 *
 * Unknown keys are collected rather than dropped: a new field appearing in
 * production should show up on the page, not silently vanish.
 */

export interface JourneyEvent {
  what: string | null;
  when: string | null;
  where: string | null;
  cost: string | null;
}

export interface JourneyDeadline {
  what: string | null;
  by: string | null;
}

export interface JourneyLink {
  url: string | null;
  pageTitle: string | null;
  pageSummary: string | null;
  fetchStatus: string | null;
  screenshotUrl: string | null;
  entities: string[];
  events: JourneyEvent[];
}

/** none = no analysis stored; triage = score/summary only; deep = full read. */
export type AnalysisShape = 'none' | 'triage' | 'deep';

/** Why a link the email carried was never opened. */
export type LinkSkipReason =
  /** The whole email was a noise content_type, so no link was followed. */
  | 'noise-content-type'
  /** Beyond kipper's per-email link cap. */
  | 'over-max-links'
  /** Not a followable URL (mailto:, unsubscribe, tracking pixel…). */
  | 'not-followable';

export interface JourneySkippedLink {
  url: string | null;
  /** Null when the payload carried a reason this build doesn't know — shown
   *  verbatim rather than silently dropped or relabelled. */
  reason: LinkSkipReason | null;
  rawReason: string | null;
  /** Set on 'over-max-links': the cap that truncated the list. */
  limit: number | null;
  /** Set on 'noise-content-type': the type that suppressed link-following. */
  contentType: string | null;
}

const LINK_SKIP_REASONS: readonly string[] = [
  'noise-content-type', 'over-max-links', 'not-followable',
];

export interface EmailJourney {
  shape: AnalysisShape;
  score: number | null;
  summary: string | null;
  contentType: string | null;
  entities: string[];
  events: JourneyEvent[];
  deadlines: JourneyDeadline[];
  keyAsks: string[];
  links: JourneyLink[];
  /** Whether the writer recorded a links array at all — absent means the
   *  writer never got to the link step, empty means it did and found none. */
  linksRecorded: boolean;
  /** Links the email carried that kipper chose NOT to open, each with the rule
   *  that stopped it. */
  linksSkipped: JourneySkippedLink[];
  /** Whether the writer recorded skips at all. Absent (false) means the run
   *  predates skip recording, so an empty `linksSkipped` proves nothing; true
   *  with an empty array is the real claim "every link was followed". */
  linksSkippedRecorded: boolean;
  /** Body-analysis keys this module doesn't know about, surfaced verbatim. */
  extraKeys: string[];
}

/** Content types whose links kipper deliberately skips (jobs/email.py). */
export const LINK_SKIP_TYPES = ['promotional', 'notification', 'transactional'] as const;

const KNOWN_BODY_KEYS = new Set([
  'score', 'summary', 'content_type', 'entities', 'events', 'deadlines', 'key_asks',
]);

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === 'string' ? x : null))
    .filter((x): x is string => x !== null && x.trim() !== '');
}

function toEvent(v: unknown): JourneyEvent | null {
  const r = asRecord(v);
  if (!r) return null;
  const event = {
    what: str(r['what']),
    when: str(r['when']),
    where: str(r['where']),
    cost: str(r['cost']),
  };
  return event.what || event.when || event.where ? event : null;
}

function toDeadline(v: unknown): JourneyDeadline | null {
  const r = asRecord(v);
  if (!r) return null;
  const deadline = { what: str(r['what']), by: str(r['by']) };
  return deadline.what || deadline.by ? deadline : null;
}

function toLink(v: unknown): JourneyLink | null {
  const r = asRecord(v);
  if (!r) return null;
  return {
    url: str(r['url']),
    pageTitle: str(r['page_title']),
    pageSummary: str(r['page_summary']),
    fetchStatus: str(r['fetch_status']),
    screenshotUrl: str(r['screenshot_url']),
    entities: strList(r['entities']),
    events: (Array.isArray(r['events']) ? r['events'] : [])
      .map(toEvent)
      .filter((e): e is JourneyEvent => e !== null),
  };
}

function toSkippedLink(v: unknown): JourneySkippedLink | null {
  const r = asRecord(v);
  if (!r) return null;
  const rawReason = str(r['reason']);
  return {
    url: str(r['url']),
    reason: rawReason !== null && LINK_SKIP_REASONS.includes(rawReason)
      ? (rawReason as LinkSkipReason)
      : null,
    rawReason,
    limit: typeof r['limit'] === 'number' ? r['limit'] : null,
    contentType: str(r['content_type']),
  };
}

export function toJourney(raw: unknown): EmailJourney {
  const ra = asRecord(raw);
  const body = asRecord(ra?.['body']);
  const linksRaw = ra?.['links'];
  const skippedRaw = ra?.['links_skipped'];

  const journey: EmailJourney = {
    shape: 'none',
    score: typeof body?.['score'] === 'number' ? body['score'] : null,
    summary: str(body?.['summary']),
    contentType: str(body?.['content_type']),
    entities: strList(body?.['entities']),
    events: (Array.isArray(body?.['events']) ? body['events'] : [])
      .map(toEvent)
      .filter((e): e is JourneyEvent => e !== null),
    deadlines: (Array.isArray(body?.['deadlines']) ? body['deadlines'] : [])
      .map(toDeadline)
      .filter((d): d is JourneyDeadline => d !== null),
    keyAsks: strList(body?.['key_asks']),
    links: (Array.isArray(linksRaw) ? linksRaw : [])
      .map(toLink)
      .filter((l): l is JourneyLink => l !== null),
    linksRecorded: Array.isArray(linksRaw),
    linksSkipped: (Array.isArray(skippedRaw) ? skippedRaw : [])
      .map(toSkippedLink)
      .filter((l): l is JourneySkippedLink => l !== null),
    linksSkippedRecorded: Array.isArray(skippedRaw),
    extraKeys: body ? Object.keys(body).filter((k) => !KNOWN_BODY_KEYS.has(k)) : [],
  };

  if (!body) return journey;

  // Deep = the writer went past triage: any structured field or a links
  // array present. A triage row carries only score/summary/content_type.
  const deep =
    journey.linksRecorded ||
    journey.entities.length > 0 ||
    journey.events.length > 0 ||
    journey.deadlines.length > 0 ||
    journey.keyAsks.length > 0 ||
    'entities' in body || 'events' in body || 'deadlines' in body || 'key_asks' in body;

  journey.shape = deep ? 'deep' : 'triage';
  return journey;
}

/**
 * True when the empty links section is explained by kipper's noise skip.
 *
 * Since 2026-08-12 kipper records the skip explicitly, so prefer that: it is
 * the writer's own account rather than our deduction from an empty array plus
 * a noise content_type. The inference stays as the fallback for rows written
 * before skip recording — same rule as analysis_writer, where recorded fact
 * beats shape-sniffing.
 */
export function linksSkippedByPolicy(j: EmailJourney): boolean {
  if (j.linksSkippedRecorded) {
    return j.linksSkipped.some((l) => l.reason === 'noise-content-type');
  }
  return (
    j.shape !== 'none' &&
    j.links.length === 0 &&
    j.contentType !== null &&
    (LINK_SKIP_TYPES as readonly string[]).includes(j.contentType)
  );
}
