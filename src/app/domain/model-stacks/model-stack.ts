// A model stack is a named, ordered preference list of model ids.
// Canonical source: `hub/model-stacks/<id>.md`.
//
// Today no consumer reads this; the registry captures the operator's intent
// for fallback chains. When agents grow native fallback support, runners will
// walk the chain on rate-limit / context errors.

export interface ModelStackMetadata {
  chain: string[];                  // ordered list of model ids (primary first)
  is_active?: boolean;
}

export interface ModelStack {
  id: string;                       // slug, e.g. 'claude-cheap-to-premium'
  name: string;
  description: string;
  metadata: ModelStackMetadata;
  body: string;
}
