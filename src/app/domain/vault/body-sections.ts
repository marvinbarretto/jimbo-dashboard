/**
 * Splits a vault item body into labelled sections for scannable rendering.
 *
 * Vault bodies are free markdown, but a house style emerged on its own — across
 * the active corpus the recurring labels are Context (60), Scope (48), Goal (37),
 * Problem (36), Now/Do/Not this. `/vault-task` now mandates that order; this
 * parser stays deliberately tolerant so the ~600 items written before the rule
 * still render as sections rather than a wall.
 */

/** Longest label we'll put in the label gutter before it stops scanning. */
const LABEL_MAX = 40;

const ATX_HEADING = /^\s{0,3}#{1,6}\s+(.+?)\s*$/;
/** A whole line in bold — the emergent heading form. Inline bold mid-sentence
 *  must NOT match, which is why the anchors wrap the entire line. */
const BOLD_HEADING = /^\s*\*\*(.+?)\*\*\s*:?\s*$/;

export type VaultBodySection = {
  /** Gutter label. null for prose that arrived before any heading. */
  readonly label: string | null;
  /** Qualifier lifted out of an over-long label, e.g. the parenthetical. */
  readonly hint: string | null;
  /** Markdown beneath the heading. */
  readonly content: string;
};

type Heading = { label: string | null; hint: string | null; reflow: string | null };

/**
 * Splits an over-long heading into a gutter label plus a hint. Falls back to
 * `reflow` — the heading line put back into the content verbatim — when no split
 * yields a short enough label, so nothing is dropped or re-marked-up.
 */
function splitLabel(raw: string, line: string): Heading {
  const text = raw.trim().replace(/:$/, '').trim();
  if (text.length <= LABEL_MAX) return { label: text, hint: null, reflow: null };

  // "Why this matters (real Watford data, 1326 events…)" → label + parenthetical.
  // Em dash and colon carry the same "head — detail" shape in practice.
  for (const sep of [/\s*\(/, /\s+—\s+/, /:\s+/]) {
    const at = text.search(sep);
    if (at <= 0) continue;
    const head = text.slice(0, at).trim();
    if (head.length > LABEL_MAX) continue;
    const tail = text.slice(at).replace(/^\s*[(—:]\s*/, '').replace(/\)$/, '').trim();
    return { label: head, hint: tail || null, reflow: null };
  }

  return { label: null, hint: null, reflow: line };
}

function matchHeading(line: string): Heading | null {
  const m = ATX_HEADING.exec(line) ?? BOLD_HEADING.exec(line);
  return m ? splitLabel(m[1], line) : null;
}

/** Drops leading/trailing blank lines without touching interior spacing. */
function trimBlankLines(lines: readonly string[]): string {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === '') start++;
  while (end > start && lines[end - 1].trim() === '') end--;
  return lines.slice(start, end).join('\n');
}

/**
 * @param body Raw markdown body, or null/undefined for an item with no body.
 * @returns Ordered sections. Empty array when there is nothing to render; a
 *   single `label: null` section when the body has no headings at all.
 */
export function parseBodySections(body: string | null | undefined): VaultBodySection[] {
  if (!body?.trim()) return [];

  const sections: VaultBodySection[] = [];
  let current: Heading = { label: null, hint: null, reflow: null };
  let buffer: string[] = [];
  let fenced = false;

  const flush = () => {
    const content = trimBlankLines(buffer);
    // A heading with nothing under it is still a signal (usually a stub), so it
    // survives; a leading run of blank lines before the first heading does not.
    if (content || current.label) {
      sections.push({ label: current.label, hint: current.hint, content });
    }
    buffer = [];
  };

  for (const line of body.split('\n')) {
    // Bold/#-prefixed lines inside a fence are code, not structure.
    if (/^\s{0,3}(```|~~~)/.test(line)) fenced = !fenced;

    const heading = fenced ? null : matchHeading(line);
    if (!heading) {
      buffer.push(line);
      continue;
    }

    flush();
    current = heading;
    if (heading.reflow) buffer.push(heading.reflow);
  }
  flush();

  return sections;
}

/** True when the body carries real structure worth rendering as label rows. */
export function hasBodySections(body: string | null | undefined): boolean {
  return parseBodySections(body).some(s => s.label !== null);
}
