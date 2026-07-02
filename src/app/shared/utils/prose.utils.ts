// Detects an inline enumerated list — "... Update: (1) foo, (2) bar, (3) baz."
// — embedded in an otherwise single-paragraph string, so it can be rendered
// as a real list without touching the stored text. Plain parenthetical
// asides like "(most impressive work is invisible)" don't match — the
// digit right after '(' is what distinguishes an enumeration marker.
export interface ParsedProse {
  readonly intro: string;
  readonly items: readonly string[];
}

// Requires 2+ numbered markers before treating this as a list — a single
// "(1)" is more likely a stray citation than an enumeration.
export function parseStructuredProse(text: string): ParsedProse | null {
  const parts = text.split(/(?=\(\d+\))/);
  if (parts.length < 3) return null;

  const [intro, ...rest] = parts;
  const items = rest
    .map(part => part.replace(/^\(\d+\)\s*/, '').replace(/[,\s]+$/, '').trim())
    .filter(Boolean);

  if (items.length < 2) return null;
  return { intro: intro.trim(), items };
}
