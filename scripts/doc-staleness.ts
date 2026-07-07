/**
 * doc-staleness.ts — report freshness of docs/modules/*.md against git history.
 *
 * Staleness is computed, not judged: a doc is stale iff commits touched its
 * declared source_paths since its reviewed_commit. Also reports orphans
 * (tracked src/ files no doc covers) so partial coverage is never silent.
 *
 * Usage:
 *   npm run docs:staleness             human-readable report
 *   npm run docs:staleness -- --json   machine-readable output
 *   npm run docs:staleness -- --check  exit 1 if anything is stale/invalid (CI)
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = join(repoRoot, 'docs', 'modules');

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const checkMode = argv.includes('--check');

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

type DocStatus = 'fresh' | 'stale' | 'invalid';

interface DocReport {
  module: string;
  file: string;
  status: DocStatus;
  reviewedCommit?: string;
  generatedAt?: string;
  commitsBehind: number;
  commits: string[]; // "<hash> <subject>" since reviewed_commit touching source_paths
  changedFiles: string[];
  problems: string[]; // validation errors (missing fields, bad commit, dead pathspecs)
  sourcePaths: string[];
}

const docFiles = readdirSync(docsDir)
  .filter((f) => f.endsWith('.md') && f !== 'README.md' && !f.startsWith('_'))
  .sort();

const head = git(['rev-parse', '--short', 'HEAD']);
const reports: DocReport[] = [];
const coveredFiles = new Set<string>();

for (const file of docFiles) {
  const raw = readFileSync(join(docsDir, file), 'utf8');
  const report: DocReport = {
    module: file.replace(/\.md$/, ''),
    file: `docs/modules/${file}`,
    status: 'fresh',
    commitsBehind: 0,
    commits: [],
    changedFiles: [],
    problems: [],
    sourcePaths: [],
  };
  reports.push(report);

  let fm: Record<string, unknown>;
  try {
    fm = matter(raw).data;
  } catch (err) {
    report.status = 'invalid';
    report.problems.push(`frontmatter parse error: ${(err as Error).message}`);
    continue;
  }

  const module = fm.module as string | undefined;
  const sourcePaths = fm.source_paths as string[] | undefined;
  const reviewedCommit = String(fm.reviewed_commit ?? '');
  report.generatedAt =
    fm.generated_at instanceof Date
      ? fm.generated_at.toISOString().slice(0, 10)
      : (fm.generated_at as string | undefined);

  if (!module) report.problems.push('missing frontmatter field: module');
  if (module && module !== report.module)
    report.problems.push(`module "${module}" does not match filename "${report.module}"`);
  if (!Array.isArray(sourcePaths) || sourcePaths.length === 0)
    report.problems.push('missing or empty frontmatter field: source_paths');
  if (!reviewedCommit) report.problems.push('missing frontmatter field: reviewed_commit');

  if (Array.isArray(sourcePaths)) {
    report.sourcePaths = sourcePaths;
    // Track coverage + flag pathspecs that match no tracked files (renamed away?).
    for (const p of sourcePaths) {
      const matches = git(['ls-files', '--', p]).split('\n').filter(Boolean);
      if (matches.length === 0) report.problems.push(`source path matches no tracked files: ${p}`);
      for (const m of matches) coveredFiles.add(m);
    }
  }

  if (reviewedCommit) {
    try {
      git(['cat-file', '-e', `${reviewedCommit}^{commit}`]);
    } catch {
      report.problems.push(`reviewed_commit not found in repo: ${reviewedCommit}`);
    }
  }

  if (report.problems.length > 0) {
    report.status = 'invalid';
    continue;
  }

  report.reviewedCommit = reviewedCommit;
  const range = `${reviewedCommit}..HEAD`;
  const log = git(['log', '--format=%h %s', range, '--', ...report.sourcePaths]);
  report.commits = log ? log.split('\n') : [];
  report.commitsBehind = report.commits.length;
  if (report.commitsBehind > 0) {
    report.status = 'stale';
    report.changedFiles = git(['diff', '--name-only', range, '--', ...report.sourcePaths])
      .split('\n')
      .filter(Boolean);
  }
}

const orphans = git(['ls-files', 'src'])
  .split('\n')
  .filter(Boolean)
  .filter((f) => !coveredFiles.has(f));

const summary = {
  head,
  checkedAt: new Date().toISOString(),
  docs: reports.length,
  fresh: reports.filter((r) => r.status === 'fresh').length,
  stale: reports.filter((r) => r.status === 'stale').length,
  invalid: reports.filter((r) => r.status === 'invalid').length,
  orphans: orphans.length,
};

if (asJson) {
  console.log(JSON.stringify({ summary, reports, orphans }, null, 2));
} else {
  const pad = Math.max(...reports.map((r) => r.module.length), 6);
  console.log(`docs/modules staleness @ HEAD ${head}\n`);
  for (const r of reports) {
    const badge = r.status === 'fresh' ? '✓ fresh' : r.status === 'stale' ? '✗ STALE' : '! INVALID';
    const detail =
      r.status === 'stale'
        ? `${r.commitsBehind} commit(s) since ${r.reviewedCommit}`
        : r.status === 'fresh'
          ? `reviewed at ${r.reviewedCommit}`
          : '';
    console.log(`  ${r.module.padEnd(pad)}  ${badge}  ${detail}`);
    for (const c of r.commits) console.log(`  ${' '.repeat(pad)}    ${c}`);
    for (const f of r.changedFiles) console.log(`  ${' '.repeat(pad)}      ${f}`);
    for (const p of r.problems) console.log(`  ${' '.repeat(pad)}    problem: ${p}`);
  }
  console.log(
    `\n  ${summary.docs} docs — ${summary.fresh} fresh, ${summary.stale} stale, ${summary.invalid} invalid`,
  );
  if (orphans.length > 0) {
    console.log(`\n  orphans (${orphans.length} tracked src files covered by no doc):`);
    for (const f of orphans) console.log(`    ${f}`);
  }
}

if (checkMode && (summary.stale > 0 || summary.invalid > 0)) process.exit(1);
