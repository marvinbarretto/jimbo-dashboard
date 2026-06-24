// Sync in-repo project manifests → jimbo_pg project rows via the dashboard-api.
//
// The repo is the source of truth (docs/project.md); this mirrors the operating
// fields into the dashboard so they can't rot in the DB. Dry-run by default —
// pass --live to actually PATCH. NOTE: talks to PRODUCTION jimbo-api, same blast
// radius as the deployed UI.
//
// Run:  node --env-file=.env --import tsx scripts/sync-project-manifests.ts [--live]
//
// M1 scope: single-repo projects (docs/project.md). The multi-repo umbrella +
// docs/repo.md aggregation is M3 — it needs the project_repos junction.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── which repos carry a single-repo manifest (M1: localshout only) ──
const SOURCES = [
  { repoPath: '/Users/marvinbarretto/development/localshout-next', file: 'docs/project.md' },
];

// Fields the sync OWNS (operating + judgment). Lifecycle/identity —
// status, kind, display_name, description, repo_url, color_token — stay
// dashboard-managed and are never touched here.
// Maps manifest key → ApiProject column. Body sections handled separately.
const FRONTMATTER_MAP: Record<string, string> = {
  intent: 'intent',
  entry_points: 'entry_points',
  autonomy_level: 'autonomy_level',
  owner: 'owner_actor_id',
};
// `conventions` is handled specially (resolved against repo_url), not in the map.
const BODY_MAP: Record<string, string> = {
  Footguns: 'footguns',
  'Out of scope': 'out_of_scope',
};
const AUTONOMY = new Set(['none', 'propose', 'ship']);

// ── API access (production jimbo-api) ──
const BASE = (process.env.JIMBO_API_URL || 'https://jimbo.fourfoldmedia.uk').replace(/\/+$/, '');
const PROJECTS_URL = BASE.endsWith('/api') ? `${BASE}/projects` : `${BASE}/api/projects`;
const API_KEY = process.env.JIMBO_API_KEY;
const LIVE = process.argv.includes('--live');

// ── minimal frontmatter + section parser ──
// The manifest frontmatter is flat scalars (no nested YAML in single-repo files),
// so a real YAML dep is overkill. M3's `repos:` list will want one.
function parseManifest(raw: string): { fm: Record<string, string>; body: Record<string, string> } {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) throw new Error('no frontmatter block');
  const [, fmText, bodyText] = fmMatch;

  const fm: Record<string, string> = {};
  for (const line of fmText.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue; // blank / full-line comment
    const i = line.indexOf(': ');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 2);
    const hash = val.indexOf(' #'); // strip inline comment (values here never contain " #")
    if (hash !== -1) val = val.slice(0, hash);
    val = val.trim().replace(/^["']|["']$/g, '');
    if (val) fm[key] = val;
  }

  // body: capture each "## Heading" section's text up to the next "## " or EOF
  const body: Record<string, string> = {};
  const sectionRe = /^##\s+(.+)$/gm;
  const headings = [...bodyText.matchAll(sectionRe)];
  headings.forEach((h, idx) => {
    const name = h[1].trim();
    const start = h.index! + h[0].length;
    const end = idx + 1 < headings.length ? headings[idx + 1].index! : bodyText.length;
    body[name] = bodyText.slice(start, end).trim();
  });

  return { fm, body };
}

// A relative `conventions: ./AGENTS.md` is correct in the repo but useless as a
// dashboard hyperlink. Resolve it to a GitHub blob URL against repo_url; absolute
// URLs pass through; if there's no repo_url to resolve against, skip rather than
// write a broken relative link.
function resolveConventions(value: string | undefined, repoUrl: unknown): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//.test(value)) return value;
  const base = typeof repoUrl === 'string' ? repoUrl.replace(/\/+$/, '') : '';
  if (!base) { console.warn(`  ! conventions="${value}" not synced — no repo_url to resolve against`); return undefined; }
  const path = value.replace(/^\.?\//, '');
  return `${base}/blob/HEAD/${path}`;
}

function buildPayload(fm: Record<string, string>, body: Record<string, string>, repoUrl: unknown): Record<string, string> {
  const payload: Record<string, string> = {};
  for (const [mk, col] of Object.entries(FRONTMATTER_MAP)) {
    if (fm[mk] == null) continue;
    if (mk === 'autonomy_level' && !AUTONOMY.has(fm[mk])) {
      console.warn(`  ! skipping autonomy_level="${fm[mk]}" (not none|propose|ship)`);
      continue;
    }
    payload[col] = fm[mk];
  }
  const conv = resolveConventions(fm.conventions, repoUrl);
  if (conv) payload.conventions_url = conv;
  for (const [section, col] of Object.entries(BODY_MAP)) {
    if (body[section]) payload[col] = body[section];
  }
  return payload;
}

const norm = (v: unknown) => (v == null ? '' : String(v).trim());

async function fetchProjects(): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(PROJECTS_URL, { headers: { 'X-API-Key': API_KEY ?? '' } });
  if (!res.ok) throw new Error(`GET ${PROJECTS_URL} → ${res.status} ${res.statusText}`);
  return res.json() as Promise<Array<Record<string, unknown>>>;
}

async function patchProject(id: string, payload: Record<string, string>): Promise<void> {
  const res = await fetch(`${PROJECTS_URL}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'X-API-Key': API_KEY ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`PATCH ${id} → ${res.status} ${res.statusText} ${await res.text()}`);
}

async function main(): Promise<void> {
  if (!API_KEY) throw new Error('JIMBO_API_KEY not set — run with `node --env-file=.env`');
  console.log(`\n${LIVE ? '🔴 LIVE' : '🟡 DRY-RUN'} — manifest sync → ${PROJECTS_URL}\n`);

  const projects = await fetchProjects();
  const byId = new Map(projects.map((p) => [String(p.id), p]));
  let changedCount = 0;

  for (const src of SOURCES) {
    const path = join(src.repoPath, src.file);
    let parsed;
    try {
      parsed = parseManifest(readFileSync(path, 'utf8'));
    } catch (e) {
      console.warn(`✗ ${path}: ${(e as Error).message}`);
      continue;
    }
    const id = parsed.fm.id;
    if (!id) { console.warn(`✗ ${path}: manifest has no \`id\``); continue; }

    const current = byId.get(id);
    if (!current) { console.warn(`✗ ${id}: no matching project row in jimbo_pg`); continue; }

    const payload = buildPayload(parsed.fm, parsed.body, current.repo_url);
    const diff = Object.entries(payload).filter(([col, val]) => norm(current[col]) !== norm(val));

    console.log(`● ${id}`);
    if (diff.length === 0) { console.log('  up to date\n'); continue; }
    for (const [col, val] of diff) {
      const before = norm(current[col]) || '∅';
      const after = String(val).replace(/\n/g, ' ').slice(0, 80);
      console.log(`  ~ ${col}: "${before.slice(0, 40)}…" → "${after}…"`);
    }

    if (LIVE) {
      const changedPayload = Object.fromEntries(diff);
      await patchProject(id, changedPayload);
      console.log('  ✓ patched');
    }
    changedCount++;
    console.log('');
  }

  console.log(`${LIVE ? 'Patched' : 'Would patch'} ${changedCount} project(s).`);
  if (!LIVE && changedCount > 0) console.log('Re-run with --live to apply.\n');
}

main().catch((e) => { console.error('\n✗', e.message, '\n'); process.exit(1); });
