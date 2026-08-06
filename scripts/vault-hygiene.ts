/**
 * vault-hygiene.ts — report structural defects across active vault items.
 *
 * Answers "why are we doing this?" is a hierarchy question, not a prose one: an
 * item with no parent epic has nothing on the detail surface that can answer it,
 * no matter how well the body is written. This reports the three defects that
 * are mechanically fixable without rewriting anyone's words:
 *
 *   orphan      no parent epic — the band that carries the "why" is empty
 *   duped-ac    acceptance criteria written into the body, which has a field
 *   empty       no body at all
 *
 * Orphan epic suggestions are scored on shared tags + title-token overlap within
 * the same project. They are candidates for a human to confirm, never a mapping
 * to apply — a wrong parent is worse than none, because it reads as deliberate.
 *
 * Read-only. There is no --live: nothing here writes to the vault.
 *
 * Usage:
 *   npx tsx scripts/vault-hygiene.ts             human-readable report
 *   npx tsx scripts/vault-hygiene.ts --json      machine-readable output
 *   npx tsx scripts/vault-hygiene.ts --defect=orphan   one section only
 */
import { parseBodySections } from '../src/app/domain/vault/body-sections';
import { rankEpicCandidates, type ScorableEpic } from '../src/app/domain/vault/epic-candidates';

const API = process.env['JIMBO_API_URL'];
const KEY = process.env['JIMBO_API_KEY'];
if (!API || !KEY) {
  console.error('JIMBO_API_URL and JIMBO_API_KEY must be set.');
  process.exit(1);
}

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const only = argv.find(a => a.startsWith('--defect='))?.split('=')[1];

/** PostgREST-backed list endpoint caps `limit` at 100 — always paginate. */
const PAGE = 100;

type Note = {
  seq: number;
  title: string;
  body: string | null;
  tags: string | string[] | null;
  parent_id: string | null;
  is_epic: number | boolean;
  acceptance_criteria: string | null;
  id: string;
};

/** Project membership is a junction table, NOT a column on the note — the list
 *  endpoint carries no project field at all, so it has to be joined in. */
async function fetchProjectLinks(): Promise<Map<string, string>> {
  // Deliberately NOT paginated: /api/vault-item-projects ignores limit and
  // offset outright (verified — limit=100&offset=1100 still returns all 1145
  // rows), so a paginate-until-short-page loop never terminates. It returning
  // >1000 rows is also the proof that no silent PostgREST cap is in play here.
  const res = await fetch(`${API}/api/vault-item-projects`, { headers: { 'X-API-Key': KEY! } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const json = await res.json();
  const rows: { vault_item_id: string; project_id: string }[] =
    Array.isArray(json) ? json : (json.data ?? json.items ?? []);
  if (rows.length === 1000) {
    // Exactly the cap is indistinguishable from a full read, and under-reading
    // here invents "unfiled" defects that don't exist.
    throw new Error('Junction read returned exactly 1000 rows — probably truncated; refusing to report.');
  }
  const byItem = new Map<string, string>();
  for (const r of rows) if (!byItem.has(r.vault_item_id)) byItem.set(r.vault_item_id, r.project_id);
  return byItem;
}

async function fetchAll(params: Record<string, string>): Promise<Note[]> {
  const out = new Map<number, Note>();
  for (let offset = 0; ; offset += PAGE) {
    const qs = new URLSearchParams({ ...params, limit: String(PAGE), offset: String(offset) });
    const res = await fetch(`${API}/api/vault/notes?${qs}`, { headers: { 'X-API-Key': KEY! } });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const json = await res.json();
    const page: Note[] = json.data ?? json.items ?? json.notes ?? [];
    for (const n of page) out.set(n.seq, n);
    if (page.length < PAGE) return [...out.values()];
  }
}

function tagsOf(n: Note): string[] {
  const raw = n.tags;
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return raw.split(',').map(t => t.trim()).filter(Boolean);
  }
}

/**
 * Adapts a raw API note to the scorer's input shape. The wire format carries
 * `tags` as a JSON string where VaultItem carries a parsed array — normalising
 * here means the report and the project-landing picker rank identically off one
 * implementation (`@domain/vault/epic-candidates`) instead of two that drift.
 */
function forScoring(n: Note): ScorableEpic {
  return { title: n.title, tags: tagsOf(n), seq: n.seq };
}

const AC_LABELS = /^acceptance criteria$/i;

async function main(): Promise<void> {
  const [tasks, epics, projectOf] = await Promise.all([
    fetchAll({ status: 'active', type: 'task' }),
    fetchAll({ status: 'active', is_epic: 'true' }),
    fetchProjectLinks(),
  ]);

  const epicsByProject = new Map<string, Note[]>();
  for (const e of epics) {
    const p = projectOf.get(e.id) ?? '—';
    if (!epicsByProject.has(p)) epicsByProject.set(p, []);
    epicsByProject.get(p)!.push(e);
  }

  const orphans = tasks
    .filter(t => !t.parent_id && !t.is_epic)
    .map(t => {
      const project = projectOf.get(t.id) ?? null;
      // Only ever suggest an epic from the item's own project — a cross-project
      // parent is a worse answer to "why" than no parent at all.
      const pool = project ? (epicsByProject.get(project) ?? []) : [];
      const candidates = rankEpicCandidates(forScoring(t), pool.map(forScoring))
        .map(c => ({ seq: c.epic.seq, title: c.epic.title, score: c.score, why: c.reasons.join(' · ') }));
      return { seq: t.seq, title: t.title, project, hasProject: Boolean(project), candidates };
    });

  const dupedAc = tasks
    .filter(t => parseBodySections(t.body).some(s => s.label && AC_LABELS.test(s.label)))
    .map(t => ({ seq: t.seq, title: t.title, hasAcField: Boolean(t.acceptance_criteria) }));

  const empty = tasks
    .filter(t => !t.body?.trim())
    .map(t => ({ seq: t.seq, title: t.title, hasParent: Boolean(t.parent_id) }));

  const report = { scanned: tasks.length, epics: epics.length, orphans, dupedAc, empty };

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const show = (d: string) => !only || only === d;
  console.log(`\nScanned ${tasks.length} active tasks against ${epics.length} active epics.\n`);

  if (show('orphan')) {
    const noProject = orphans.filter(o => !o.hasProject).length;
    const withCands = orphans.filter(o => o.candidates.length > 0).length;
    console.log(`── ORPHANS · ${orphans.length} tasks with no parent epic (${noProject} also unfiled)`);
    console.log(`   ${withCands} have a candidate epic in their own project; the rest need a human.\n`);
    for (const o of orphans.slice(0, 60)) {
      console.log(`  #${o.seq} ${o.title.slice(0, 78)}`);
      console.log(`      project: ${o.project ?? '— UNFILED —'}`);
      for (const c of o.candidates) console.log(`      ? #${c.seq} ${c.title.slice(0, 52)}  (${c.score}: ${c.why})`);
      if (!o.candidates.length) console.log(`      ? no candidate — pick or create an epic`);
    }
    if (orphans.length > 60) console.log(`  … and ${orphans.length - 60} more (use --json)`);
    console.log();
  }

  if (show('duped-ac')) {
    console.log(`── DUPED ACs · ${dupedAc.length} bodies restate acceptance criteria`);
    console.log(`   ${dupedAc.filter(d => d.hasAcField).length} of them also have the field populated.\n`);
    for (const d of dupedAc) console.log(`  #${d.seq} ${d.title.slice(0, 78)}${d.hasAcField ? '' : '   [field EMPTY — migrate, do not delete]'}`);
    console.log();
  }

  if (show('empty')) {
    console.log(`── EMPTY · ${empty.length} tasks with no body at all`);
    console.log(`   ${empty.filter(e => e.hasParent).length} at least have a parent epic for context.\n`);
    for (const e of empty) console.log(`  #${e.seq} ${e.title.slice(0, 78)}${e.hasParent ? '' : '   [+ orphan]'}`);
    console.log();
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
