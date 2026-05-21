# Artifact convention — design

**Status:** proposal, 2026-05-21. Not built. Drafted while auditing reinvent-me where 67 dispatches produced exactly 1 traceable artifact (hub PR #12) and even that wasn't recorded in `dispatch_queue.pr_url`.

## Problem

When a skill produces something durable — a draft, a research brief, a positioning doc — it currently lands wherever the skill prompt happens to suggest. The LinkedIn draft from dispatch 756 went to `hub/docs/drafts/note_d7bf65d3.md`. That's fine ad-hoc, but:

- `dispatch_queue.result_artifacts` is empty (it's a free-text column we never populate)
- `dispatch_queue.pr_url` is NULL even though a PR exists
- No way to list "every artifact produced for project reinvent-me" without scraping hub
- No frontmatter contract, so artifacts can't be re-read by downstream skills

## Goal

Every `write/*` skill drops to a known path, with required frontmatter. The dispatch row carries a structured pointer. The dashboard project-detail page renders the list.

## Path layout (in hub repo)

```
hub/
  artifacts/
    <project_slug>/
      <note_id>__<kebab-slug-of-title>.md
```

Examples:
- `hub/artifacts/reinvent-me/note_d7bf65d3__linkedin-headline-and-about.md`
- `hub/artifacts/reinvent-me/note_a343dbbd__paid-discovery-rate-band.md`

If the note has no project, fallback to `hub/artifacts/_unscoped/`. Pure refs (e.g. references that decomposed into research) still get an artifact at the *child* note level, not the parent.

## Frontmatter contract

```yaml
---
note_id: note_d7bf65d3
project_id: reinvent-me
skill: write/draft-doc
dispatch_id: 756
model: claude-sonnet-4-6
produced_at: 2026-05-20T16:22:34Z
artifact_kind: draft   # draft | brief | research | code-stub | positioning | pitch
status: draft          # draft | approved | published | superseded
supersedes: null       # optional: note_id of an older artifact this replaces
---
```

Body is free-form markdown beneath. The skill decides structure (sections, checklists, etc.) within that.

## Database changes

`dispatch_queue.result_artifacts` becomes structured JSON, not free text:

```ts
type ResultArtifact = {
  kind: 'file' | 'pr' | 'url';
  path?: string;        // hub-relative for kind='file'
  url?: string;         // for kind='pr' | 'url'
  pr_number?: number;   // for kind='pr'
  summary?: string;     // optional one-liner
};
// stored as JSONB; column type stays TEXT for back-compat, parsed on read
```

A skill can emit multiple — typically `{kind:'file', path:'artifacts/reinvent-me/...'}` AND `{kind:'pr', url:'...', pr_number:12}`.

`dispatch_queue.pr_url` stays as the convenience column, populated when any artifact has `kind='pr'`.

## Skill changes

`write/draft-doc` and any other `write/*` skill needs two prompt updates:
- "Write to `hub/artifacts/<project>/<note_id>__<kebab-title>.md`. Project slug comes from `skill_context.project_id`. If absent, use `_unscoped`."
- "Include the required frontmatter block above the body. All fields listed are mandatory."

Submit endpoint (the one with `completes_dispatch: true`) accepts an `artifacts` array and writes it to the dispatch row.

## Dashboard surface

`features/projects/containers/project-detail/` gets a new section: **Artifacts**.

Query: `SELECT d.* FROM dispatch_queue d JOIN vault_item_projects p ON p.vault_item_id = d.task_id WHERE p.project_id = $1 AND d.result_artifacts IS NOT NULL ORDER BY d.completed_at DESC`.

Render as a table — title (from the note), artifact_kind chip, model, completed_at, link out (PR or file path).

## Backfill

One-off: parse existing `dispatch_queue.result_summary` for the 2 reinvent-me `write/draft-doc` rows (756, 757), look up the hub PR, populate `result_artifacts` + `pr_url`. Script lives in `scripts/backfill-result-artifacts.ts`, dry-run by default.

## Open questions

- **Where do non-doc artifacts live?** A `research` skill that returns a structured brief is still markdown — same path. But `code-stub` that drops a file under `dashboard/src/...` ? Tilt: only `write/*` skills use `hub/artifacts/`; code skills emit a PR and we record `kind='pr'` only.
- **Supersedes chain.** If Marvin re-runs decompose with edits, the new artifact `supersedes` the old. UI shows only the head of the chain by default. Defer until we have one.
- **Per-project README.** Auto-generated `hub/artifacts/<project>/README.md` index? Probably yes once we have >5 artifacts per project. Defer.

## Build order

1. Frontmatter spec + one example artifact written by hand (migrate hub PR #12's file to the new path + frontmatter).
2. Backfill script + run for the 2 existing reinvent-me rows.
3. Update `write/draft-doc` skill prompt to emit the new path + frontmatter.
4. Submit endpoint accepts structured `artifacts`.
5. Dashboard artifacts panel in project-detail.
