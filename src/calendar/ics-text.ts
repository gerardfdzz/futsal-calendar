/**
 * RFC 5545 TEXT escaping and line folding (§3.3.11 and §3.1).
 *
 * These two functions are precisely the "fragile if hand-rolled" part the
 * project brief warned about, so they get outsized test coverage
 * (`tests/calendar/ics-text.test.ts`) — byte-level, not just
 * character-level, because RFC 5545's 75-octet line limit is measured in
 * UTF-8 *bytes*, and Catalan/Spanish team and venue names are full of
 * multi-byte accented characters (á, é, í, ó, ú, ñ, ç, ...).
 */

export const CRLF = '\r\n';

const MAX_OCTETS_PER_LINE = 75;

/**
 * Escapes a plain-text value for use inside a TEXT-valued ICS property
 * (SUMMARY, LOCATION, X-WR-CALNAME, ...). Per RFC 5545 §3.3.11:
 * backslash, semicolon and comma get a backslash escape; newlines become
 * the literal two-character sequence `\n`. Order matters — backslashes
 * must be escaped FIRST, or the backslashes inserted by the later steps
 * would themselves get re-escaped.
 *
 * Apostrophes are deliberately left untouched: RFC 5545 does not treat
 * `'` as a special character, so team names like "L'Ametlla" pass through
 * unescaped (verified by tests — this is a common a place to over-escape
 * by mistake).
 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Folds a single, already-escaped content line so no physical line
 * exceeds 75 octets (UTF-8 bytes), per RFC 5545 §3.1. Continuation lines
 * are joined with CRLF + a single leading space, and that leading space
 * counts against the following line's 75-octet budget.
 *
 * Splits are only ever made on octet boundaries that do NOT fall inside a
 * multi-byte UTF-8 sequence — RFC 5545 explicitly calls out "very simple
 * implementations" that get this wrong, which is exactly the trap this
 * function exists to avoid.
 */
export function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= MAX_OCTETS_PER_LINE) {
    return line;
  }

  const decoder = new TextDecoder('utf-8');
  const chunks: string[] = [];
  let start = 0;
  let budget = MAX_OCTETS_PER_LINE;

  while (start < bytes.length) {
    let end = Math.min(start + budget, bytes.length);
    // A UTF-8 continuation byte has the high bits `10xxxxxx` (0x80-0xBF).
    // Back off until `end` doesn't point into the middle of one.
    while (end > start && isUtf8ContinuationByte(bytes[end])) {
      end--;
    }
    chunks.push(decoder.decode(bytes.slice(start, end)));
    start = end;
    // Continuation lines are prefixed with a single space when re-joined
    // below, so they get one fewer octet of budget to stay <= 75 total.
    budget = MAX_OCTETS_PER_LINE - 1;
  }

  return chunks.join(CRLF + ' ');
}

function isUtf8ContinuationByte(byte: number | undefined): boolean {
  return byte !== undefined && (byte & 0xc0) === 0x80;
}
