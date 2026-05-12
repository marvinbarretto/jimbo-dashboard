/**
 * Lowercase + hyphenated slug. Strips diacritics, collapses runs of
 * non-alphanumeric chars to a single dash, trims dashes at the ends.
 *
 * Intentionally permissive — does NOT enforce a leading-letter rule, since
 * different entities have different ID patterns. Layer that as a Validator
 * on the form control if needed.
 */
const COMBINING_MARKS = /[\u0300-\u036f]/g;
const AMPERSAND = /&/g;
const NON_ALNUM_RUN = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(AMPERSAND, '-and-')
    .replace(NON_ALNUM_RUN, '-')
    .replace(EDGE_DASHES, '');
}
