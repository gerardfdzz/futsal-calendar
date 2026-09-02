/**
 * Fallback label for a team's crest circle when `TeamRef.crest` is
 * `null`/absent. Not meant to be a clever abbreviation, just something
 * short and stable to put in a circle.
 */
export function teamInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '';
  }
  if (words.length === 1) {
    return words[0]!.slice(0, 3).toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}
