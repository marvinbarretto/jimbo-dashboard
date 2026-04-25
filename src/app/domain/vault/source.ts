import type { ActorId } from '../ids';

// Where a vault item came from. Each kind has its own shape — `ref` and `url`
// are typed differently per branch so a programmer can't accidentally write a
// telegram message id where an email id is expected, or omit a URL where one
// is structurally required.
//
// Postgres-side this is a JSONB column with a discriminator on `kind`. The
// type-level union here is the single source of truth for shape.

// 'org/repo#N' or 'repo#N' — template literal type catches typos at the boundary.
// We intentionally accept both `${string}#${number}` patterns; the org prefix is
// often encoded in `url` instead.
export type PrCommentRef = `${string}#${number}`;

export interface ManualSource {
  kind: 'manual';
  ref:  string;            // operator-chosen marker, e.g. 'marvin-2026-04-23'
  url:  null;
}

export interface EmailSource {
  kind: 'email';
  ref:  string;            // Gmail message id
  url:  string | null;     // optional Gmail web URL
}

export interface TelegramSource {
  kind: 'telegram';
  ref:  string;            // Telegram message id
  url:  null;
}

export interface AgentSource {
  kind: 'agent';
  ref:  ActorId;           // branded — typed FK to the actor that spawned this
  url:  null;
}

export interface UrlSource {
  kind: 'url';
  ref:  string;            // canonical/cleaned URL for dedup
  url:  string;            // captured original
}

export interface PrCommentSource {
  kind: 'pr-comment';
  ref:  PrCommentRef;      // 'repo#N' format, type-enforced
  url:  string;            // GitHub link — required for navigability
}

export type Source =
  | ManualSource
  | EmailSource
  | TelegramSource
  | AgentSource
  | UrlSource
  | PrCommentSource;

export type SourceKind = Source['kind'];
