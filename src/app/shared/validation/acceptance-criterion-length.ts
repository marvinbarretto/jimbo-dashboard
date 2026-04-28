export type ACLengthStatus = 'clean' | 'verbose' | 'exceeds';

// Policy thresholds tied to the hermes prompt's stated limits.
const VERBOSE_AT = 121;
const EXCEEDS_AT = 201;

export function acceptanceCriterionStatus(text: string): ACLengthStatus {
  const len = text.length;
  if (len >= EXCEEDS_AT) return 'exceeds';
  if (len >= VERBOSE_AT) return 'verbose';
  return 'clean';
}
