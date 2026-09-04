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
  lines.push(`UID:fcf-${match.id}@${config.uidDomain}`);
  lines.push(`DTSTAMP:${formatUtcDateTime(config.now)}`);
  lines.push(`DTSTART;TZID=${ICS_TIME_ZONE}:${formatMadridLocalDateTime(match.startsAt)}`);
  lines.push(`DTEND;TZID=${ICS_TIME_ZONE}:${formatMadridLocalDateTime(endsAt)}`);
  lines.push(`SUMMARY:${escapeIcsText(`⚽ ${match.homeTeam.name} - ${match.awayTeam.name}`)}`);

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
