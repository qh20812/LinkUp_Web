/**
 * Count Unicode code points (not UTF-16 code units), matching the server's
 * `utf8.RuneCountInString` used for content length validation. Surrogate
 * pairs (emoji, rare CJK) count as 1, so client-side limit checks agree
 * with the backend.
 */
export function runeLength(text: string): number {
  return Array.from(text).length
}
