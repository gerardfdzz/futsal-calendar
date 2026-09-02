import type { Match } from '../domain/match.js';
import {
  DEFAULT_MATCH_DURATION_MINUTES,
  DEFAULT_PROD_ID,
  DEFAULT_UID_DOMAIN,
  type GenerateIcsOptions,
} from './ics-config.js';
import { CRLF, escapeIcsText, foldLine } from './ics-text.js';
import { formatMadridLocalDateTime, formatUtcDateTime, ICS_TIME_ZONE, MADRID_VTIMEZONE_LINES } from './ics-timezone.js';
import { mapMatchStatusToIcsStatus } from './ics-status.mapper.js';

/**
 * Builds a complete, RFC 5545-conformant `VCALENDAR` document (as a
 * single string, `\r\n`-terminated, ready to serve as
 * `text/calendar; charset=utf-8`) from already-filtered domain matches.
 *
 * By design this function does NOT filter by team, exclude byes, or talk
 * to the FCF — it takes whatever `Match[]` it's given and turns it into
 * ICS. Composing "fetch -> filter -> generate" is the future HTTP
 * endpoint's job (Milestone 3); keeping this function pure and
 * side-effect-free is what makes it trivial to unit test without mocking
 * anything.
 *
 * ## SEQUENCE, LAST-MODIFIED, DTSTAMP — without persistence
 *
 * The brief asked for careful analysis here, so to be explicit about
 * what's actually happening:
 *
 * - **DTSTAMP** is set to `now` (generation time) for every event, every
 *   time. This is exactly what RFC 5545 expects for a dynamically
 *   generated `METHOD:PUBLISH` calendar — DTSTAMP marks when *this*
 *   representation of the object was produced, not when the underlying
 *   data last changed.
 * - **LAST-MODIFIED** is also set to `now`, for a more pointed reason: we
 *   have no persistence, so we have no record of when a match's data
 *   *actually* last changed, and the FCF's own DTO doesn't expose an
 *   "updated at" field either. Claiming any other timestamp would be
 *   fabricated. Setting it to "now" is the only value we can state
 *   honestly on every generation.
 * - **SEQUENCE is fixed at `0`** for every event, always. RFC 5545 defines
 *   SEQUENCE to let a client tell that a specific UID has been revised
 *   and order updates — but computing a real, monotonically increasing
 *   SEQUENCE requires remembering the previous version of each match
 *   (by CODACTA) to detect that something changed, which means
 *   persistence. Without it, incrementing SEQUENCE would either be
 *   arbitrary (defeating its purpose) or require re-deriving it from
 *   nothing, which isn't possible.
 *
 *   This is deliberately NOT a blocker for the MVP: SEQUENCE is primarily
 *   meaningful for **iTIP scheduling** (REQUEST/REPLY/CANCEL messages
 *   between an organizer and attendees, RFC 5546), which needs it to
 *   resolve out-of-order delivery of scheduling messages. We are not
 *   doing iTIP scheduling — this is a `METHOD:PUBLISH` read-only
 *   subscription with no attendees. For that case, calendar clients
 *   (Apple Calendar included) key updates off of **UID equality plus the
 *   event's current content** on each re-fetch, not off SEQUENCE
 *   increments. A constant SEQUENCE is a well-understood limitation of
 *   stateless generation, not a correctness bug for this use case.
 *
 *   **If real usage shows a client failing to pick up updates because of
 *   this**, the fix is Milestone 5+: persist, per match, a content hash
 *   (or just DTSTART/venue/status) plus its own SEQUENCE counter in
 *   Supabase/Postgres; on each sync, compare the new data against the
 *   stored hash, bump SEQUENCE and refresh LAST-MODIFIED only when it
 *   actually changed, and leave it untouched otherwise. That's a small,
 *   additive change — it does not require re-architecting this
 *   generator, only feeding it real SEQUENCE/LAST-MODIFIED values instead
 *   of the constants used here.
 */
export function generateIcs(matches: readonly Match[], options: GenerateIcsOptions): string {
  const prodId = options.prodId ?? DEFAULT_PROD_ID;
  const durationMinutes = options.matchDurationMinutes ?? DEFAULT_MATCH_DURATION_MINUTES;
  const uidDomain = options.uidDomain ?? DEFAULT_UID_DOMAIN;
  const now = options.now ?? new Date();

  const lines: string[] = [];

  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push(`PRODID:${prodId}`);
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push(`X-WR-CALNAME:${escapeIcsText(options.calendarName)}`);
  lines.push(`X-WR-TIMEZONE:${ICS_TIME_ZONE}`);
  lines.push(...MADRID_VTIMEZONE_LINES);

  for (const match of matches) {
    lines.push(...buildVEventLines(match, { durationMinutes, uidDomain, now }));
  }

  lines.push('END:VCALENDAR');

  return lines.map(foldLine).join(CRLF) + CRLF;
}

interface VEventConfig {
  readonly durationMinutes: number;
  readonly uidDomain: string;
  readonly now: Date;
}

function buildVEventLines(match: Match, config: VEventConfig): string[] {
  const lines: string[] = [];

  const endsAt = new Date(match.startsAt.getTime() + config.durationMinutes * 60_000);
  const icsStatus = mapMatchStatusToIcsStatus(match.status);

  lines.push('BEGIN:VEVENT');
  // Stable regardless of date/time/venue/status changes — see
  // domain/match.ts and federation/fcf/fcf.mapper.ts for why `match.id`
  // (== CODACTA) never changes across syncs.
  lines.push(`UID:fcf-${match.id}@${config.uidDomain}`);
  lines.push(`DTSTAMP:${formatUtcDateTime(config.now)}`);
  lines.push(`DTSTART;TZID=${ICS_TIME_ZONE}:${formatMadridLocalDateTime(match.startsAt)}`);
  lines.push(`DTEND;TZID=${ICS_TIME_ZONE}:${formatMadridLocalDateTime(endsAt)}`);
  lines.push(`SUMMARY:${escapeIcsText(`${match.homeTeam.name} - ${match.awayTeam.name}`)}`);

  if (match.venue) {
    lines.push(`LOCATION:${escapeIcsText(match.venue.name)}`);
    if (match.venue.latitude !== undefined && match.venue.longitude !== undefined) {
      lines.push(`GEO:${match.venue.latitude};${match.venue.longitude}`);
    }
  }

  lines.push('SEQUENCE:0');
  lines.push(`LAST-MODIFIED:${formatUtcDateTime(config.now)}`);
  if (icsStatus) {
    lines.push(`STATUS:${icsStatus}`);
  }

  lines.push('END:VEVENT');

  return lines;
}
