/**
 * Sanitise user search input for use inside a PostgREST `.or()` filter string.
 *
 * Commas and parentheses are structural characters in `.or()` and cannot be
 * escaped inside a pattern, so they are replaced with spaces; `%`, `_` and `\`
 * are LIKE wildcards and are escaped so they match literally.
 */
export function ilikeTerm(raw: string): string {
  return raw
    .replace(/[,()]/g, " ")
    .replace(/[\\%_]/g, (m) => `\\${m}`)
    .replace(/\s+/g, " ")
    .trim();
}

/** Escape LIKE wildcards only — for single `.ilike()` calls outside `.or()`. */
export function escapeLike(raw: string): string {
  return raw.replace(/[\\%_]/g, (m) => `\\${m}`).trim();
}
