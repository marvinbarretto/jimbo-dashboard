// Hand-mirrored from jimbo-api src/schemas/module-docs.ts (zod). These aren't
// in api-types.generated.ts yet — regenerate via `npm run gen:api-types` once
// the deployed OpenAPI spec includes /api/modules, then swap these out.

export type ModuleDocStalenessStatus = 'fresh' | 'stale' | 'unknown';

export interface ModuleDocStaleness {
  // 'unknown' = staleness could not be computed (no git, bad reviewed_commit)
  // — badge as unverified, never as fresh.
  status: ModuleDocStalenessStatus;
  reviewed_commit: string | null;
  commits_behind: number | null;
  /** "<hash> <subject>" lines since reviewed_commit touching source_paths. */
  commits: string[];
  changed_files: string[];
}

export interface ModuleDocSummary {
  module: string;
  repo: string;
  description: string;
  generated_at: string | null;
  /** section slug → 'derived' | 'asserted' */
  sections: Record<string, string>;
  source_paths: string[];
  staleness: ModuleDocStaleness;
}

export interface ModuleDoc extends ModuleDocSummary {
  /** Markdown body without frontmatter. */
  body: string;
}

export interface ModuleDocListResponse {
  /** Short HEAD commit of the serving checkout, null if git unavailable. */
  head: string | null;
  items: ModuleDocSummary[];
}
