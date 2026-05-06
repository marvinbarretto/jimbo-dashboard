// Cross-cutting capability vocabulary used by the dispatch matcher.
// Skills declare what they `requires`, actors declare what they `serves`,
// optionally Models tag which `classes` they satisfy. Dispatch eligibility
// is set-superset: actor.serves ⊇ skill.requires.
//
// Adding a new capability is one entry here + a corresponding update on the
// affected actor rows; existing skills don't need to know about it.

export type SkillCapability =
  | 'frontier'      // strongest reasoning — Opus / Sonnet 4.x class
  | 'fast'          // cheap-quick — Haiku class
  | 'vision'        // accepts image inputs
  | 'long-context'  // 200k+ token window
  | 'local-only'    // must run locally (filesystem touch, privacy)
  | 'cloud-only';   // must run in cloud (frontier-only available there)

export const ALL_CAPABILITIES: readonly SkillCapability[] = [
  'frontier',
  'fast',
  'vision',
  'long-context',
  'local-only',
  'cloud-only',
] as const;

// Short human-friendly label. Lives next to the type so forms and detail
// views render the same vocabulary without each component re-mapping.
export const CAPABILITY_LABELS: Record<SkillCapability, string> = {
  'frontier':     'Frontier',
  'fast':         'Fast',
  'vision':       'Vision',
  'long-context': 'Long context',
  'local-only':   'Local only',
  'cloud-only':   'Cloud only',
};
