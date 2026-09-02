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
 * ICS, which keeps it pure and trivial to unit test.
 *
 * ## SEQUENCE, LAST-MODIFIED, DTSTAMP — without persistence
 *
 * - **DTSTAMP** is `now` on every generation, as RFC 5545 expects for a
 *   dynamically generated `METHOD:PUBLISH` calendar: it marks when this
 *   representation was produced, not when the data last changed.
 * - **LAST-MODIFIED** is also `now`, because without persistence we have
 *   no record of when a match's data actually last changed (the FCF DTO
 *   doesn't expose one either) — any other value would be fabricated.
 * - **SEQUENCE is fixed at `0`.** A real, monotonically increasing
 *   SEQUENCE would require remembering each match's previous version to
 *   detect changes, which means persistence. This is not a correctness
 *   bug here: SEQUENCE mainly matters for iTIP scheduling
 *   (REQUEST/REPLY/CANCEL between an organizer and attendees), and this
 *   is a `METHOD:PUBLISH` read-only subscription with no attendees —
 *   calendar clients key updates off UID equality plus the event's
 *   current content on each re-fetch, not off SEQUENCE increments.
 *
 *   If real usage shows a client failing to pick up updates, the fix is
 *   to persist a per-match content hash plus its own SEQUENCE counter,
 *   and bump SEQUENCE/LAST-MODIFIED only when the stored hash changes —
 *   an additive change that doesn't require re-architecting this
 *   generator.
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
