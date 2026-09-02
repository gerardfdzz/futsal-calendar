/**
 * Centralized, overridable defaults for ICS generation. Nothing in
 * `ics-generator.ts` hardcodes these values inline — every one of them is
 * exactly what the project brief asked to keep "centralizada y
 * configurable" (match duration in particular).
 */

/** How long a match "occupies" on the calendar, absent a real end time
 *  from the FCF (it doesn't send one). 90 minutes = 2x25min halves +
 *  break, a reasonable default for futsal; override per call if needed. */
export const DEFAULT_MATCH_DURATION_MINUTES = 90;

/** RFC 5545 PRODID — identifies the product that generated the calendar.
 *  Not user-facing; safe to keep generic until the app has a real name. */
export const DEFAULT_PROD_ID = '-//futsal-calendar//FCF Sync//CA';

/** Domain used to build `UID:fcf-{CODACTA}@{uidDomain}`. Fixed in
 *  Milestone 4 to the real deployment domain
 *  (`partitsalcalendari.com`) — from this point on, changing it is a
 *  BREAKING CHANGE, not a config tweak: it would silently create
 *  duplicate events for every existing subscriber instead of updating
 *  them, because the UID is exactly what Apple Calendar (and RFC 5545
 *  clients generally) use to recognize "this is the same event as
 *  before". The value does not need to be reachable over HTTP — RFC
 *  5545 only requires it to be a stable, globally-unique namespace, and
 *  a domain we own is the natural choice. */
export const DEFAULT_UID_DOMAIN = 'partitsalcalendari.com';

export interface GenerateIcsOptions {
  /** Human-readable calendar name (`X-WR-CALNAME`), e.g. "CFS LA SÉNIA". */
  readonly calendarName: string;
  readonly prodId?: string;
  readonly matchDurationMinutes?: number;
  readonly uidDomain?: string;
  /** Injectable "current time" for `DTSTAMP`/`LAST-MODIFIED` — defaults to
   *  `new Date()`. Tests pass a fixed value for deterministic output. */
  readonly now?: Date;
}
