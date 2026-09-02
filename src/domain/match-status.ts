/**
 * Domain-level status of a match.
 *
 * This is intentionally NOT a 1:1 mirror of any FCF field. The FCF exposes
 * `CERRADA` and `ESTADO` as opaque numeric-string codes and, as of writing,
 * we have only confirmed the meaning of one combination ("0"/"0" = not yet
 * played). Everything else must map to `'unknown'` until we observe real
 * examples — see `mapFcfStatus` in `federation/fcf/fcf-status.mapper.ts`.
 *
 * 'unknown' is a first-class value, not an error: a match we cannot
 * classify yet should still appear on the calendar (with its best-known
 * date/time), rather than being dropped.
 */
export type MatchStatus = 'scheduled' | 'finished' | 'postponed' | 'cancelled' | 'unknown';
