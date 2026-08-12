// Sync in-repo project manifests → jimbo_pg project rows via the dashboard-api.
//
// The repo is the source of truth; this mirrors operating context into the
// dashboard so it can't rot in the DB. Dry-run by default — pass --live to PATCH.
// NOTE: talks to PRODUCTION jimbo-api, same blast radius as the deployed UI.
//
// Run:  node --env-file=.env --import tsx scripts/sync-project-manifests.ts [--live]
//
// API-DRIVEN: the loop iterates the project registry (GET /api/projects), not a
// filesystem sweep. Each project's repo_url locates its local checkout
// (basename → <dev>/<name>); its docs/project.md is the manifest. Projects with
// no repo_url (goals / life-admin) are skipped — they stay dashboard-owned.
//
// Two manifest kinds (see docs/architecture/project-manifest.md):
//   docs/project.md — a project umbrella / single-repo project's operating fields.
//   docs/repo.md    — one member codebase of a multi-repo project, located via the
//                     umbrella's declared `repos:` paths and folded into repos[].

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const DEV = process.env.MANIFEST_DEV_ROOT || '/Users/marvinbarretto/development';

// project.md operating fields the sync owns. manifest key → ApiProject column.
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

// repo_url → local checkout path by basename convention (…/localshout-next →
// <dev>/localshout-next). Null repo_url ⇒ no local repo ⇒ caller skips.
/**
 * Sha of the last commit that touched a manifest — provenance for every field
 * this sweep copies, so an odd-looking `intent` can be traced to the commit
 * that set it rather than guessed at.
 *
 * @returns The full sha, or null when git can't answer (not a repo, file never
 *   committed, git absent). Null is honest; a placeholder would not be.
 */
function manifestCommit(repoPath: string, manifestPath: string): string | null {
  try {
    const sha = execFileSync(
      'git',
      ['log', '-1', '--format=%H', '--', manifestPath],
      { cwd: repoPath, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    return sha || null;
  } catch {
    return null;
  }
}

/**
 * Where a project's `docs/project.md` lives inside its checkout.
 *
 * Normally the checkout root. But a family of independent apps can share one
 * repo (spoonscount and munro-bagger both point at collectr), and only one of
 * them can own the root manifest. So when the root manifest declares someone
 * else's id, look one level down under the monorepo's workspace dirs for the
 * manifest that declares *this* id. Files stay the source of truth — the
 * manifest still names its own project, we just widen where we look for it.
 *
 * @returns Absolute path to the matching manifest, or null when none declares
 *   this id (the caller counts that as "not manifested yet").
 */
function resolveManifest(localPath: string, id: string): string | null {
  const root = join(localPath, 'docs/project.md');
  if (existsSync(root)) {
    const { fm } = parseManifest(readFileSync(root, 'utf8'));
    // No id at all ⇒ single-repo project, manifest is trivially its own.
    if (!fm.id || fm.id === id) return root;
  }
  for (const workspace of ['apps', 'packages']) {
    const dir = join(localPath, workspace);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      const candidate = join(dir, entry, 'docs/project.md');
      if (!existsSync(candidate)) continue;
      const { fm } = parseManifest(readFileSync(candidate, 'utf8'));
      if (fm.id === id) return candidate;
    }
  }
  return null;
}

function repoUrlToLocalPath(repoUrl: unknown): string | null {
  if (typeof repoUrl !== 'string' || !repoUrl) return null;
  const name = repoUrl.replace(/\.git$/, '').replace(/\/+$/, '').split('/').pop();
  return name ? join(DEV, name) : null;
}

// ── minimal frontmatter + section parser (flat scalars; the nested repos: list
// is parsed separately by memberPaths) ──
function parseManifest(raw: string): { fm: Record<string, string>; body: Record<string, string> } {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) throw new Error('no frontmatter block');
  const [, fmText, bodyText] = fmMatch;

  const fm: Record<string, string> = {};
  for (const line of fmText.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#') || line.trimStart().startsWith('-')) continue;
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

// Member paths from an umbrella's `repos:` list (indented `- { …, path: X, … }`).
// Relative to the dev root, so a member outside the umbrella dir (hub/hermes)
// is still found. Returns [] for single-repo projects (no repos: block).
function memberPaths(raw: string): string[] {
  const paths: string[] = [];
  let inRepos = false;
  for (const line of raw.split('\n')) {
    if (/^repos:\s*$/.test(line)) { inRepos = true; continue; }
    if (!inRepos) continue;
    if (/^\S/.test(line)) break; // next top-level key ends the block
    const m = line.match(/path:\s*([^\s,}]+)/);
    if (m) paths.push(m[1]);
  }
  return paths;
}

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
  path: string | null;
  role: string | null;
  entry_points: string | null;
  footguns: string | null;
  conventions_url: string | null;
  autonomy_level: string | null;
}

// `path` comes from the umbrella's `repos:` list, not the member's own repo.md —
// only the umbrella knows where it declared the member. It is what vault items
// cite (`jimbo/jimbo-api/src/routes/…`), so the card has to carry it.
function buildRepoCard(fm: Record<string, string>, body: Record<string, string>, path: string): ProjectRepo {
  return {
    repo: fm.repo,
    path: path || null,
    role: fm.role ?? null,
    entry_points: fm.entry_points ?? null,
    footguns: body['Footguns'] ?? null,
    conventions_url: /^https?:\/\//.test(fm.conventions ?? '') ? fm.conventions : null,
    autonomy_level: fm.autonomy_level && AUTONOMY.has(fm.autonomy_level) ? fm.autonomy_level : null,
  };
}

// Canonical (sorted-key) serialization — Postgres jsonb doesn't preserve key
// order, so plain JSON.stringify would diff a round-tripped repos array forever.
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object).sort().map(k => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}
const norm = (v: unknown) => (v == null ? '' : typeof v === 'object' ? canonical(v) : String(v).trim());

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

// Build the repos[] cards for a multi-repo umbrella from its declared member paths.
function buildRepos(raw: string): ProjectRepo[] | null {
  const cards: ProjectRepo[] = [];
  for (const mp of memberPaths(raw)) {
    const repoMd = join(DEV, mp, 'docs/repo.md');
    if (!existsSync(repoMd)) { console.warn(`  ! member repo.md missing: ${repoMd}`); continue; }
    try {
      const { fm, body } = parseManifest(readFileSync(repoMd, 'utf8'));
      if (fm.repo) cards.push(buildRepoCard(fm, body, mp));
    } catch (e) { console.warn(`  ! ${repoMd}: ${(e as Error).message}`); }
  }
  // Stable order by slug so the stored array is idempotent across runs.
  return cards.length ? cards.sort((a, b) => a.repo.localeCompare(b.repo)) : null;
}

async function main(): Promise<void> {
  if (!API_KEY) throw new Error('JIMBO_API_KEY not set — run with `node --env-file=.env`');
  console.log(`\n${LIVE ? '🔴 LIVE' : '🟡 DRY-RUN'} — manifest sync → ${PROJECTS_URL}\n`);

  const projects = await fetchProjects();
  let changedCount = 0;
  let skippedNoRepo = 0;
  let skippedNoManifest = 0;

  for (const current of projects) {
    const id = String(current.id);
    const localPath = repoUrlToLocalPath(current.repo_url);
    if (!localPath) { skippedNoRepo++; continue; }            // no repo → dashboard-owned

    // Shared-repo aware: a manifest belongs to exactly the project whose id it
    // declares, so for a family sharing one repo_url (munro-bagger/spoonscount
    // both point at collectr) this finds the member manifest, not the root one.
    const manifestPath = resolveManifest(localPath, id);
    if (!manifestPath) { skippedNoManifest++; continue; } // repo, but no manifest yet

    let raw: string;
    try { raw = readFileSync(manifestPath, 'utf8'); } catch { continue; }
    const { fm, body } = parseManifest(raw);

    const payload = buildProjectPayload(fm, body, current.repo_url);
    const repos = buildRepos(raw);
    if (repos) payload.repos = repos;

    const commit = manifestCommit(localPath, manifestPath);

    const diff = Object.entries(payload).filter(([col, val]) => norm(current[col]) !== norm(val));
    // A manifested project whose content already matches still needs synced_at
    // stamped once, or it never flips to repo-owned (read-only) in the UI.
    // Projects synced before provenance existed need the same one-off stamp.
    const needsStamp = !current.synced_at || (commit !== null && current['synced_commit'] !== commit);

    console.log(`● ${id}${commit ? `  @${commit.slice(0, 7)}` : '  (no commit — uncommitted or not a repo)'}`);
    if (diff.length === 0 && !needsStamp) { console.log('  up to date\n'); continue; }
    if (diff.length === 0) console.log('  (content already matches — stamping provenance)');
    for (const [col, val] of diff) {
      const after = col === 'repos'
        ? `${(val as ProjectRepo[]).length} repo(s): ${(val as ProjectRepo[]).map((r) => r.repo).join(', ')}`
        : String(val).replace(/\n/g, ' ').slice(0, 70) + '…';
      console.log(`  ~ ${col}: ${after}`);
    }

    if (LIVE) {
      await patchProject(id, {
        ...Object.fromEntries(diff),
        synced_at: new Date().toISOString(),
        ...(commit ? { synced_commit: commit } : {}),
      });
      console.log('  ✓ patched (provenance stamped)');
    }
    changedCount++;
    console.log('');
  }

  console.log(`${LIVE ? 'Patched' : 'Would patch'} ${changedCount} project(s). Skipped ${skippedNoRepo} no-repo, ${skippedNoManifest} without a manifest.`);
  if (!LIVE && changedCount > 0) console.log('Re-run with --live to apply.\n');
}

main().catch((e) => { console.error('\n✗', e.message, '\n'); process.exit(1); });
