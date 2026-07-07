# Module docs

One markdown file per module of this codebase. Each doc explains the module's
purpose, responsibilities, public API, lifecycle, dependencies, and technical
debt — with frontmatter that makes staleness **computable** rather than hoped-for.

Consumers: jimbo-api (context ingestion), the dashboard (rendering + staleness
badges), and Hermes (grounding). The repo is the source of truth; everything
else is a view.

## The freshness contract

Every doc carries frontmatter:

```yaml
---
module: vault-items              # kebab-case, unique within the repo
repo: dashboard
description: One-line summary of the module.
source_paths:                    # git pathspecs (globs allowed) this doc covers
  - src/app/features/vault-items/**
generated_at: 2026-07-07        # date the body was last written/updated
reviewed_commit: 1688511        # HEAD when the doc was last verified against code
sections:                        # which sections are mechanical vs judgement
  purpose: asserted
  responsibilities: asserted
  public-api: derived
  lifecycle: derived
  dependencies: derived
  tech-debt: asserted
---
```

Staleness is a pure git query — no LLM involved in detection:

```
git log <reviewed_commit>..HEAD -- <source_paths>
```

Zero commits → the doc is provably fresh. N commits → stale, and those diffs
are exactly what a refresher needs to read. Run the check with:

```
npm run docs:staleness           # human-readable report
npm run docs:staleness -- --json # machine-readable (for jimbo-api / dashboard)
npm run docs:staleness -- --check# exit 1 if anything is stale (for CI)
```

The script also reports **orphans** — tracked files under `src/` not covered by
any doc's `source_paths` — so partial coverage is visible, never silent.
(Only `src/` is scanned; `pomo-app/`, `prototypes/`, `wireframes/`, `e2e/`
and the Hono `api/` sidecar are out of scope for module docs.)

## Derived vs asserted sections

- **derived** (`public-api`, `lifecycle`, `dependencies`): regenerable from
  code. When stale, rewrite these to match the source, mechanically.
- **asserted** (`purpose`, `responsibilities`, `tech-debt`): judgement calls.
  A refresher must NOT silently rewrite these. Only touch them when the diffs
  contradict them — and then flag the contradiction in the update rather than
  papering over it. Tech-debt entries record "we know and chose not to fix";
  regenerating them from scratch destroys that context.

## Refresh protocol

When `docs:staleness` reports a module stale:

1. Read the doc, then the commits/diffs since `reviewed_commit` (the script
   lists them).
2. Update derived sections to match the code.
3. Touch asserted sections only on contradiction; flag what changed and why.
4. Bump `reviewed_commit` to the new HEAD and `generated_at` to today —
   even if the body needed no changes. Fresh must always be provable.
5. Commit the doc alongside or after the code change.

## Adding a module

Copy `_template.md`, fill it in, verify `source_paths` against
`git ls-files -- <paths>` (a pathspec matching nothing is reported as an
error), and check the orphan list shrinks accordingly.
