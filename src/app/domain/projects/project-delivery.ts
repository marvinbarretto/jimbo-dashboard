import type { Project, ProjectAutonomyLevel } from './project';

// The four boundaries an autonomous unit of work crosses: commission → merge
// → review → promote. Only the first is declared anywhere in Jimbo, and only
// the last three are observed, so every row here is half-known by design.
//
// The point of the widget this feeds is to make that asymmetry legible rather
// than paper over it: a boundary with no policy says "not declared", and a
// boundary whose instrument is dark says so instead of showing a zero. A blank
// cell would read as "nothing needed here", which is the one meaning none of
// these cells ever has.

// ── Slice of GET /api/projects/{id}/state ──────────────────────────
//
// Hand-written, and deliberately only the fields this widget reads — the full
// state response also carries beliefs, epics, proposals and activity that this
// section has no business typing. Regenerate api-types.generated.ts once the
// `delivery` block is deployed and these can be narrowed to it.

export type DeliveryCiState = 'passing' | 'failing' | 'pending' | 'none';

export interface DeliveryPr {
  number: number;
  title: string;
  url: string;
  ci: DeliveryCiState;
  auto_merge: boolean;
  age_days: number;
  note_seq: number | null;
  draft: boolean;
}

export interface ProjectDelivery {
  repo: string | null;
  latest_tag: string | null;
  unshipped: number;
  open_prs: DeliveryPr[];
  failing: number;
  auto_merge: number;
  /**
   * Non-null ⇒ every count above is UNMEASURED, not zero. The API fills a
   * repo it could not reach with a shaped row of zeros so the block still has
   * a type; reading those as "nothing outstanding" is reading a dark
   * instrument as a clean bill of health.
   */
  error: string | null;
}

/** Only the parts of /state this section reads. */
export interface ProjectStateDeliverySlice {
  delivery: ProjectDelivery | null;
  wip: {
    proposed_dispatches: number;
    in_flight_dispatches: number;
  };
}

// ── Row model ──────────────────────────────────────────────────────

/**
 * Why a cell says what it says.
 *   'stated'       — a real value, or a real measured zero.
 *   'not-declared' — nothing in Jimbo models this boundary at all.
 *   'unmeasured'   — it is modelled, but nobody looked or the look failed.
 */
export type DeliveryCellState = 'stated' | 'not-declared' | 'unmeasured';

export interface DeliveryCell {
  state: DeliveryCellState;
  text: string;
  hint: string | null;
}

export type DeliveryBoundary = 'Commission' | 'Merge' | 'Review' | 'Promote';

export interface DeliveryBoundaryRow {
  boundary: DeliveryBoundary;
  declared: DeliveryCell;
  live: DeliveryCell;
  /** The one row that should draw the eye. Today: a red PR. */
  alert: boolean;
}

const NOT_DECLARED = (hint: string): DeliveryCell => ({ state: 'not-declared', text: 'not declared', hint });
const UNMEASURED = (text: string, hint: string | null = null): DeliveryCell => ({ state: 'unmeasured', text, hint });
const STATED = (text: string, hint: string | null = null): DeliveryCell => ({ state: 'stated', text, hint });

// Autonomy is advisory: the only check in the codebase is
// `autonomy_level !== 'ship'` on the manual enqueue path, so 'none' and
// 'propose' are indistinguishable at runtime and the commission pump never
// reads it at all. Same wording as the radio group further down the page —
// one page must not describe one field two ways.
const AUTONOMY_SCOPE =
  'Advisory. Read by manually enqueued dispatches only; the automatic commission '
  + 'pump is scoped by the global pipeline.autonomous_projects valve instead.';

const AUTONOMY_LABEL: Record<string, { label: string; hint: string }> = {
  '': { label: 'Default (inherit)', hint: 'No project policy set. Behaves as Propose.' },
  none: { label: 'None — read-only', hint: 'Not enforced today — behaves as Propose. Kept for intent, not effect.' },
  propose: { label: 'Propose', hint: 'A commission lands as “proposed” and waits for your approval.' },
  ship: { label: 'Ship', hint: 'A commission skips approval and enters the queue directly.' },
};

function commissionDeclared(level: ProjectAutonomyLevel | null): DeliveryCell {
  const entry = AUTONOMY_LABEL[level ?? ''];
  // A null autonomy_level is still a declared position — "inherit the default"
  // — so it is 'stated', not 'not-declared'. The undeclared boundaries below
  // are the ones with no field at all.
  return STATED(entry.label, `${entry.hint} ${AUTONOMY_SCOPE}`);
}

function commissionLive(wip: ProjectStateDeliverySlice['wip']): DeliveryCell {
  const { proposed_dispatches: proposed, in_flight_dispatches: inFlight } = wip;
  if (proposed === 0 && inFlight === 0) return STATED('Nothing queued');
  return STATED(`${proposed} proposed · ${inFlight} in flight`);
}

function mergeLive(d: ProjectDelivery): DeliveryCell {
  if (d.error) return UNMEASURED('Unavailable', d.error);
  if (d.open_prs.length === 0) return STATED('No open PRs');
  const parts = [`${d.open_prs.length} open`];
  if (d.failing > 0) parts.push(`${d.failing} failing`);
  if (d.auto_merge > 0) parts.push(`${d.auto_merge} auto-merge`);
  return STATED(
    parts.join(' · '),
    d.failing > 0
      ? 'A red PR with auto-merge on does not fail loudly — it silently never lands.'
      : null,
  );
}

function promoteLive(d: ProjectDelivery): DeliveryCell {
  if (d.error) return UNMEASURED('Unavailable', d.error);
  // No tag means nothing has ever been released, so there is no delta to
  // count. Rendering the API's 0 here would claim "fully shipped".
  if (!d.latest_tag) {
    return UNMEASURED('Never tagged', 'Nothing has been released, so there is no unshipped delta to measure.');
  }
  if (d.unshipped === 0) return STATED(`${d.latest_tag} · nothing unshipped`);
  return STATED(`${d.latest_tag} · ${d.unshipped} unshipped`);
}

/**
 * Whether this project has a codebase at all.
 *
 * Same self-contained check the operating-context section makes: a
 * travel-planning or life-admin project crosses none of these boundaries, and
 * the section should render nothing rather than four "not declared" rows.
 */
export function hasCodebase(project: Pick<Project, 'repo_url' | 'repos'>): boolean {
  return !!project.repo_url || !!(project.repos && project.repos.length > 0);
}

export function deriveDeliveryRows(
  project: Pick<Project, 'autonomy_level' | 'deploy_target'>,
  slice: ProjectStateDeliverySlice,
): DeliveryBoundaryRow[] {
  const d = slice.delivery;
  const noSweep = UNMEASURED(
    'Not measured',
    'The API reported no delivery data for this project.',
  );
  const deployTarget = project.deploy_target?.trim();

  return [
    {
      boundary: 'Commission',
      declared: commissionDeclared(project.autonomy_level),
      live: commissionLive(slice.wip),
      alert: false,
    },
    {
      boundary: 'Merge',
      declared: NOT_DECLARED('Auto-merge is a per-PR GitHub setting, not a project-level policy.'),
      live: d ? mergeLive(d) : noSweep,
      alert: !!d && !d.error && d.failing > 0,
    },
    {
      boundary: 'Review',
      declared: NOT_DECLARED('commission_concurrency_cap is a global valve, not a per-project one.'),
      // Nothing in Jimbo records per-PR review state, and deriving one from
      // "passing, not draft, no auto-merge" would be a claim the data cannot
      // support. Say it is unmeasured instead.
      live: UNMEASURED('Not measured', 'Nothing records awaiting-review state; the open PRs above are the closest signal.'),
      alert: false,
    },
    {
      boundary: 'Promote',
      declared: deployTarget
        ? STATED(deployTarget)
        : NOT_DECLARED('No deploy target recorded on the brief.'),
      live: d ? promoteLive(d) : noSweep,
      alert: false,
    },
  ];
}

/** Failing PRs first — the rows that want attention lead. Draft PRs sink. */
export function sortPrsForAttention(prs: readonly DeliveryPr[]): DeliveryPr[] {
  const rank = (pr: DeliveryPr): number => {
    if (pr.draft) return 3;
    if (pr.ci === 'failing') return 0;
    if (pr.ci === 'none') return 1;
    return 2;
  };
  return [...prs].sort((a, b) => rank(a) - rank(b) || b.age_days - a.age_days);
}
