import { getWallTimeComponents } from '../shared/timezone.js';

export const ICS_TIME_ZONE = 'Europe/Madrid';

/**
 * Static RFC 5545 VTIMEZONE block for Europe/Madrid, embedded so the
 * calendar is fully self-contained (RFC 5545 recommends including the
 * VTIMEZONE definition for any TZID a calendar references).
 *
 * Encodes the standard EU DST rule for Europe/Madrid (last Sunday of
 * March -> CEST, last Sunday of October -> CET) as an RRULE so it's
 * correct for every year without updates. If the EU ever changes its DST
 * policy, this block (and only this block) needs updating.
 */
export const MADRID_VTIMEZONE_LINES: readonly string[] = [
  'BEGIN:VTIMEZONE',
  `TZID:${ICS_TIME_ZONE}`,
  'X-LIC-LOCATION:Europe/Madrid',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

/**
 * Formats an instant as an RFC 5545 local `DATE-TIME` value
 * (`YYYYMMDDTHHMMSS`, no trailing `Z`) in Europe/Madrid wall-clock time —
 * the inverse of `federation/fcf/fcf-date.ts`'s `parseFcfDate`. Used for
 * `DTSTART;TZID=Europe/Madrid:...` / `DTEND;TZID=Europe/Madrid:...`.
 */
export function formatMadridLocalDateTime(date: Date): string {
  const wall = getWallTimeComponents(date, ICS_TIME_ZONE);
  return (
    `${wall.year}${pad(wall.month)}${pad(wall.day)}` + `T${pad(wall.hour)}${pad(wall.minute)}${pad(wall.second)}`
  );
}

/**
 * Formats an instant as an RFC 5545 UTC `DATE-TIME` value
 * (`YYYYMMDDTHHMMSSZ`). Used for `DTSTAMP` / `LAST-MODIFIED`, which are
 * always expressed in UTC regardless of the event's own timezone.
 */
export function formatUtcDateTime(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}
