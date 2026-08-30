/**
 * The `## Why` block from an epic body, or null.
 *
 * Convention rather than a column, deliberately: `definition_of_done` has been
 * a column for the whole life of the vault and is filled on 0 of 629 items.
 * Prose in a body people already write beats a field they never fill — promote
 * it once the shape has proven itself.
 *
 * Mirrors `epicWhy` in jimbo-api's dispatch service, which does the same read
 * for the review card. Duplicated rather than shared because the two live in
 * different repos; if they drift, the review card and the item modal will
 * disagree about whether an epic has said why it exists.
 *
 * @param body the epic's markdown body
 * @returns the block's text, or null when there is no Why or it is an empty stub
 */
export function epicWhy(body: string | null | undefined): string | null {
  if (!body) return null;
  // `(?![\s\S])` rather than `$` for end-of-input: the `m` flag is needed so the
  // heading can be found mid-body, and it also turns `$` into an end-of-LINE
  // anchor — which silently truncates every Why to its first line.
  const m = /^[ \t]*#{1,4}[ \t]*why\b[^\n]*\n([\s\S]*?)(?=\n[ \t]*#{1,4}[ \t]+\S|(?![\s\S]))/im.exec(body);
  const text = m?.[1]?.trim();
  return text ? text : null;
}

/** What an epic's Why is asked to answer — shown as a prompt when it has none. */
export const EPIC_WHY_PROMPTS = [
  "Who it's for",
  'What changes for them',
  "How we'd know it worked",
] as const;
