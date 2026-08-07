/**
 * epic-grounding.ts — report which epics can answer "who does this serve, and
 * what does it move", and whether their project can even supply the answer.
 *
 * An epic is the band a task's detail view renders as its why. An epic with no
 * trace silently un-grounds its whole subtree — and a trace can't be written at
 * all if the project has no `personas` / `success_criteria` to point at. So this
 * reports both levels, project-first: fixing the brief unblocks every epic under
 * it, and grounding epics under an empty brief is guesswork.
 *
 * Read-only. There is no --live: nothing here writes.
 *
 * Usage:
 *   npx tsx scripts/epic-grounding.ts          human-readable report
 *   npx tsx scripts/epic-grounding.ts --json   machine-readable output
 */
import { criterionExpected, isEpicGrounded } from '../src/app/domain/vault/epic-grounding';

const API = process.env['JIMBO_API_URL'];
const KEY = process.env['JIMBO_API_KEY'];
if (!API || !KEY) {
  console.error('JIMBO_API_URL and JIMBO_API_KEY must be set.');
  process.exit(1);
}

const asJson = process.argv.slice(2).includes('--json');
const PAGE = 100;

type Note = {
  id: string;
  seq: number;
  title: string;
  parent_id: string | null;
  is_epic: number | boolean;
  serves_persona?: string | null;
  moves_criterion?: string | null;
};

type Project = {
  id: string;
  display_name: string;
  personas: string | null;
  success_criteria: string | null;
  intent: string | null;
};

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { 'X-API-Key': KEY! } });
  if (!res.ok) throw new Error(`${res.status} ${path}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

function unwrap<T>(d: unknown): T[] {
  if (Array.isArray(d)) return d as T[];
  const o = d as Record<string, unknown>;
  return (o['data'] ?? o['items'] ?? o['notes'] ?? []) as T[];
}

async function fetchNotes(params: string): Promise<Note[]> {
  const seen = new Map<number, Note>();
  for (let offset = 0; ; offset += PAGE) {
    const page = unwrap<Note>(await api(`/api/vault/notes?${params}&limit=${PAGE}&offset=${offset}`));
    for (const n of page) seen.set(n.seq, n);
    if (page.length < PAGE) return [...seen.values()];
  }
}

/** Counts the bullets in a newline-bulleted brief field. 0 = nothing to cite. */
function bulletCount(v: string | null): number {
  if (!v?.trim()) return 0;
  return v.split('\n').map(l => l.trim()).filter(l => l.length > 1).length;
}

/** A criterion is measurable if it carries a number, a percentage, or a date. */
function measurableLines(v: string | null): number {
  if (!v?.trim()) return 0;
  return v.split('\n').filter(l => /\d/.test(l) && /%|\bby\b|\d\s*(users?|events?|days?|weeks?|months?|\/)/i.test(l)).length;
}

async function main(): Promise<void> {
  const [projects, epics, tasks, links] = await Promise.all([
    api<unknown>('/api/projects').then(unwrap<Project>),
    fetchNotes('is_epic=true&status=active'),
    fetchNotes('status=active&type=task'),
    // Junction ignores limit/offset and returns every row — see vault-hygiene.ts.
    api<unknown>('/api/vault-item-projects').then(unwrap<{ vault_item_id: string; project_id: string }>),
  ]);

  const projectOf = new Map<string, string>();
  for (const l of links) if (!projectOf.has(l.vault_item_id)) projectOf.set(l.vault_item_id, l.project_id);

  const childCount = new Map<string, number>();
  for (const t of tasks) if (t.parent_id) childCount.set(t.parent_id, (childCount.get(t.parent_id) ?? 0) + 1);

  const byProject = new Map<string, Note[]>();
  for (const e of epics) {
    const p = projectOf.get(e.id) ?? '— unfiled —';
    if (!byProject.has(p)) byProject.set(p, []);
    byProject.get(p)!.push(e);
  }

  const rows = [...byProject.entries()]
    .map(([projectId, es]) => {
      const proj = projects.find(p => p.id === projectId);
      return {
        projectId,
        personas: bulletCount(proj?.personas ?? null),
        criteria: bulletCount(proj?.success_criteria ?? null),
        measurable: measurableLines(proj?.success_criteria ?? null),
        // The one rule, shared with the detail view and the project page. A
        // report that disagreed with the UI would be worse than no report.
        criterionExpected: criterionExpected(proj ?? null),
        epics: es
          .map(e => ({
            seq: e.seq,
            title: e.title,
            children: childCount.get(e.id) ?? 0,
            serves: e.serves_persona ?? null,
            moves: e.moves_criterion ?? null,
            grounded: isEpicGrounded(
              { serves_persona: e.serves_persona ?? null, moves_criterion: e.moves_criterion ?? null },
              proj ?? null,
            ),
          }))
          .sort((a, b) => b.children - a.children),
      };
    })
    .sort((a, b) => b.epics.length - a.epics.length);

  if (asJson) {
    console.log(JSON.stringify({ projects: rows }, null, 2));
    return;
  }

  const grounded = rows.flatMap(r => r.epics).filter(e => e.grounded).length;
  console.log(`\n${epics.length} active epics · ${grounded} grounded · ${epics.length - grounded} with no trace\n`);
  console.log('Personas are what ground an epic. A criterion is only chased where the');
  console.log('project states any — enabling projects (jimbo) have none by design, and');
  console.log('their real targets live in the projects they serve.\n');

  for (const r of rows) {
    // Only missing personas actually block grounding now. Missing criteria is a
    // legitimate resting state, not a gap to nag about.
    const blocked = r.personas === 0;
    const criteria = r.criteria === 0
      ? 'criteria:none (not required)'
      : `criteria:${r.criteria} (${r.measurable} measurable)`;
    console.log(`── ${r.projectId}  ${r.epics.length} epics · personas:${r.personas} ${criteria}${blocked ? '   ⚠ NO PERSONAS — CANNOT GROUND' : ''}`);
    for (const e of r.epics) {
      const state = e.grounded ? 'grounded' : e.serves || e.moves ? 'half' : '—';
      console.log(`   ${state.padEnd(9)} #${e.seq} ${e.title.slice(0, 62).padEnd(62)} ${e.children} children`);
    }
    console.log();
  }

  const blockedProjects = rows.filter(r => r.personas === 0);
  console.log(blockedProjects.length
    ? `Needs personas before its epics can be grounded (${blockedProjects.length}): ${blockedProjects.map(r => r.projectId).join(', ')}`
    : 'Every project with epics has personas.');
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
