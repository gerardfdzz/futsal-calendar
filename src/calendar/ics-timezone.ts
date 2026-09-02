import { getWallTimeComponents } from '../shared/timezone.js';

export const ICS_TIME_ZONE = 'Europe/Madrid';

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

export function formatMadridLocalDateTime(date: Date): string {
  const wall = getWallTimeComponents(date, ICS_TIME_ZONE);
  return (
    `${wall.year}${pad(wall.month)}${pad(wall.day)}` + `T${pad(wall.hour)}${pad(wall.minute)}${pad(wall.second)}`
  );
}

export function formatUtcDateTime(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}
