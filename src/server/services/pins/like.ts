/** Escape LIKE/ILIKE wildcards (default escape char `\`) so input matches literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
