// Sync in-repo project manifests → jimbo_pg project rows via the dashboard-api.
//
// The repo is the source of truth; this mirrors operating context into the
// dashboard so it can't rot in the DB. Dry-run by default — pass --live to PATCH.
// NOTE: talks to PRODUCTION jimbo-api, same blast radius as the deployed UI.
//
// Run:  node --env-file=.env --import tsx scripts/sync-project-manifests.ts [--live]
//
// Two manifest kinds (see docs/architecture/project-manifest.md):
//   docs/project.md — a project umbrella / single-repo project. Maps to the
//                     project's own operating fields (intent, entry_points, …).
//   docs/repo.md    — one member codebase of a multi-repo project. Grouped by
//                     its `project:` field into that project's repos[] (jsonb).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DEV = '/Users/marvinbarretto/development';

// Single-repo projects + multi-repo umbrellas (their own operating fields).
const PROJECT_DOCS = [
  { repoPath: `${DEV}/localshout-next`, file: 'docs/project.md' },
  { repoPath: `${DEV}/jimbo`,           file: 'docs/project.md' }, // jimbo umbrella
];

// Member codebases of multi-repo projects → grouped by `project:` into repos[].
const REPO_DOCS = [
  { repoPath: `${DEV}/jimbo/dashboard`, file: 'docs/repo.md' },
  { repoPath: `${DEV}/jimbo/jimbo-api`, file: 'docs/repo.md' },
  { repoPath: `${DEV}/hub/hermes`,      file: 'docs/repo.md' },
];

// project.md operating fields the sync owns. Lifecycle/identity stay
// dashboard-managed. manifest key → ApiProject column.
const PROJECT_FIELD_MAP: Record<string, string> = {
  intent: 'intent',
  entry_points: 'entry_points',
  autonomy_level: 'autonomy_level',
  owner: 'owner_actor_id',
};
const BODY_MAP: Record<string, string> = {
  Footguns: 'footguns',
  'Out of scope': 'out_of_scope',
};
const AUTONOMY = new Set(['none', 'propose', 'ship']);

const BASE = (process.env.JIMBO_API_URL || 'https://jimbo.fourfoldmedia.uk').replace(/\/+$/, '');
const PROJECTS_URL = BASE.endsWith('/api') ? `${BASE}/projects` : `${BASE}/api/projects`;
const API_KEY = process.env.JIMBO_API_KEY;
const LIVE = process.argv.includes('--live');

// ── minimal frontmatter + section parser ──
// Manifest frontmatter is flat scalars; a real YAML dep is overkill (M3's repos
// are derived from repo.md files, so we never parse the umbrella's nested list).
function parseManifest(raw: string): { fm: Record<string, string>; body: Record<string, string> } {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) throw new Error('no frontmatter block');
  const [, fmText, bodyText] = fmMatch;

  const fm: Record<string, string> = {};
  for (const line of fmText.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const i = line.indexOf(': ');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 2);
    const hash = val.indexOf(' #');
    if (hash !== -1) val = val.slice(0, hash);
    val = val.trim().replace(/^["']|["']$/g, '');
    if (val) fm[key] = val;
  }

  const body: Record<string, string> = {};
  const headings = [...bodyText.matchAll(/^##\s+(.+)$/gm)];
  headings.forEach((h, idx) => {
    const start = h.index! + h[0].length;
    const end = idx + 1 < headings.length ? headings[idx + 1].index! : bodyText.length;
    body[h[1].trim()] = bodyText.slice(start, end).trim();
  });

  return { fm, body };
}

// A relative `conventions: ./AGENTS.md` is correct in the repo but useless as a
// dashboard link. Resolve to a GitHub blob URL against repo_url; absolute URLs
// pass through; no repo_url → skip rather than write a broken relative link.
function resolveConventions(value: string | undefined, repoUrl: unknown): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//.test(value)) return value;
  const base = typeof repoUrl === 'string' ? repoUrl.replace(/\/+$/, '') : '';
  if (!base) return undefined;
  return `${base}/blob/HEAD/${value.replace(/^\.?\//, '')}`;
}

function buildProjectPayload(fm: Record<string, string>, body: Record<string, string>, repoUrl: unknown): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [mk, col] of Object.entries(PROJECT_FIELD_MAP)) {
    if (fm[mk] == null) continue;
    if (mk === 'autonomy_level' && !AUTONOMY.has(fm[mk])) continue;
    payload[col] = fm[mk];
  }
  const conv = resolveConventions(fm.conventions, repoUrl);
  if (conv) payload.conventions_url = conv;
  for (const [section, col] of Object.entries(BODY_MAP)) {
    if (body[section]) payload[col] = body[section];
  }
  return payload;
}

interface ProjectRepo {
  repo: string;
  role: string | null;
  entry_points: string | null;
  footguns: string | null;
  conventions_url: string | null;
  autonomy_level: string | null;
}

function buildRepoCard(fm: Record<string, string>, body: Record<string, string>): ProjectRepo {
  return {
    repo: fm.repo,
    role: fm.role ?? null,
    entry_points: fm.entry_points ?? null,
    footguns: body['Footguns'] ?? null,
    // Member-repo conventions can't be resolved without that repo's web URL
    // (not in the project row); left null until repo.md declares it.
    conventions_url: /^https?:\/\//.test(fm.conventions ?? '') ? fm.conventions : null,
    autonomy_level: fm.autonomy_level && AUTONOMY.has(fm.autonomy_level) ? fm.autonomy_level : null,
  };
}

const norm = (v: unknown) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v).trim());

async function fetchProjects(): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(PROJECTS_URL, { headers: { 'X-API-Key': API_KEY ?? '' } });
  if (!res.ok) throw new Error(`GET ${PROJECTS_URL} → ${res.status} ${res.statusText}`);
  return res.json() as Promise<Array<Record<string, unknown>>>;
}

async function patchProject(id: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${PROJECTS_URL}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'X-API-Key': API_KEY ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`PATCH ${id} → ${res.status} ${res.statusText} ${await res.text()}`);
}

function read(src: { repoPath: string; file: string }): { fm: Record<string, string>; body: Record<string, string> } | null {
  try {
    return parseManifest(readFileSync(join(src.repoPath, src.file), 'utf8'));
  } catch (e) {
    console.warn(`✗ ${join(src.repoPath, src.file)}: ${(e as Error).message}`);
    return null;
  }
}

async function main(): Promise<void> {
  if (!API_KEY) throw new Error('JIMBO_API_KEY not set — run with `node --env-file=.env`');
  console.log(`\n${LIVE ? '🔴 LIVE' : '🟡 DRY-RUN'} — manifest sync → ${PROJECTS_URL}\n`);

  // Parse project.md files keyed by id.
  const projectDocs = new Map<string, { fm: Record<string, string>; body: Record<string, string> }>();
  for (const src of PROJECT_DOCS) {
    const parsed = read(src);
    if (parsed?.fm.id) projectDocs.set(parsed.fm.id, parsed);
    else if (parsed) console.warn(`✗ ${src.repoPath}/${src.file}: no \`id\``);
  }

  // Group repo.md cards by their declared project.
  const repoCards = new Map<string, ProjectRepo[]>();
  for (const src of REPO_DOCS) {
    const parsed = read(src);
    if (!parsed) continue;
    const pid = parsed.fm.project;
    if (!pid || !parsed.fm.repo) { console.warn(`✗ ${src.repoPath}/${src.file}: needs \`project\` + \`repo\``); continue; }
    (repoCards.get(pid) ?? repoCards.set(pid, []).get(pid)!).push(buildRepoCard(parsed.fm, parsed.body));
  }

  const projects = await fetchProjects();
  const byId = new Map(projects.map((p) => [String(p.id), p]));
  const ids = new Set([...projectDocs.keys(), ...repoCards.keys()]);
  let changedCount = 0;

  for (const id of ids) {
    const current = byId.get(id);
    if (!current) { console.warn(`✗ ${id}: no matching project row in jimbo_pg`); continue; }

    const payload: Record<string, unknown> = {};
    const doc = projectDocs.get(id);
    if (doc) Object.assign(payload, buildProjectPayload(doc.fm, doc.body, current.repo_url));
    if (repoCards.has(id)) payload.repos = repoCards.get(id);

    const diff = Object.entries(payload).filter(([col, val]) => norm(current[col]) !== norm(val));
    // A manifested project whose content already matches still needs synced_at
    // stamped once, or it never flips to repo-owned (read-only) in the UI.
    const needsStamp = !current.synced_at;

    console.log(`● ${id}`);
    if (diff.length === 0 && !needsStamp) { console.log('  up to date\n'); continue; }
    if (diff.length === 0) console.log('  (content already matches — stamping synced_at)');
    for (const [col, val] of diff) {
      const after = col === 'repos'
        ? `${(val as ProjectRepo[]).length} repo(s): ${(val as ProjectRepo[]).map((r) => r.repo).join(', ')}`
        : String(val).replace(/\n/g, ' ').slice(0, 70) + '…';
      console.log(`  ~ ${col}: ${after}`);
    }

    if (LIVE) {
      // Stamp provenance on every write; kept out of the diff so re-runs are idempotent.
      await patchProject(id, { ...Object.fromEntries(diff), synced_at: new Date().toISOString() });
      console.log('  ✓ patched (synced_at stamped)');
    }
    changedCount++;
    console.log('');
  }

  console.log(`${LIVE ? 'Patched' : 'Would patch'} ${changedCount} project(s).`);
  if (!LIVE && changedCount > 0) console.log('Re-run with --live to apply.\n');
}

main().catch((e) => { console.error('\n✗', e.message, '\n'); process.exit(1); });
