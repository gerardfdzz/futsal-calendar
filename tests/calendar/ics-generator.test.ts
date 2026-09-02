import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateIcs } from '../../src/calendar/ics-generator.js';
import { buildMatch } from '../fixtures/match.fixtures.js';

/** Reassembles folded content lines (CRLF + leading space) back into one
 *  logical line per property, the way a real ICS parser would — makes
 *  assertions below independent of exactly where a fold happened to
 *  land. */
function unfoldIcs(ics: string): string[] {
  const physicalLines = ics.split('\r\n').filter((line) => line !== '');
  const logicalLines: string[] = [];
  for (const line of physicalLines) {
    if (line.startsWith(' ') && logicalLines.length > 0) {
      logicalLines[logicalLines.length - 1] += line.slice(1);
    } else {
      logicalLines.push(line);
    }
  }
  return logicalLines;
}

function findLine(lines: readonly string[], prefix: string): string | undefined {
  return lines.find((line) => line.startsWith(prefix));
}

const FIXED_NOW = new Date('2026-09-01T10:00:00.000Z');

test('generateIcs: produces a well-formed VCALENDAR envelope', () => {
  const ics = generateIcs([], { calendarName: 'CFS LA SÉNIA', now: FIXED_NOW });
  const lines = unfoldIcs(ics);

  assert.equal(lines[0], 'BEGIN:VCALENDAR');
  assert.equal(lines[lines.length - 1], 'END:VCALENDAR');
  assert.ok(lines.includes('VERSION:2.0'));
  assert.ok(lines.includes('CALSCALE:GREGORIAN'));
  assert.ok(lines.includes('METHOD:PUBLISH'));
  assert.ok(lines.includes('X-WR-CALNAME:CFS LA SÉNIA'));
  assert.ok(lines.includes('X-WR-TIMEZONE:Europe/Madrid'));
  assert.ok(lines.includes('BEGIN:VTIMEZONE'));
  assert.ok(lines.includes('TZID:Europe/Madrid'));
  assert.match(findLine(lines, 'PRODID:') ?? '', /futsal-calendar/);
});

test('generateIcs: uses CRLF line endings, not bare \\n (RFC 5545 §3.1)', () => {
  const ics = generateIcs([buildMatch()], { calendarName: 'CFS LA SÉNIA', now: FIXED_NOW });
  assert.ok(ics.includes('\r\n'));
  // No line-feed-without-carriage-return survives outside escaped `\n`
  // sequences inside a TEXT value.
  const withoutCrlf = ics.replace(/\r\n/g, '');
  assert.ok(!withoutCrlf.includes('\n'));
});

test('generateIcs: builds a VEVENT with UID, DTSTART/DTEND in Europe/Madrid, and SUMMARY', () => {
  const match = buildMatch({
    id: '4151650',
    homeTeam: { id: '54755993', name: 'CFS LA SÉNIA' },
    awayTeam: { id: '12345678', name: "L'AMETLLA" },
    startsAt: new Date('2026-09-26T16:30:00.000Z'), // 18:30 Europe/Madrid (CEST)
  });
  const ics = generateIcs([match], { calendarName: 'CFS LA SÉNIA', now: FIXED_NOW });
  const lines = unfoldIcs(ics);

  assert.ok(lines.includes('UID:fcf-4151650@partitsalcalendari.com'));
  assert.ok(lines.includes('DTSTART;TZID=Europe/Madrid:20260926T183000'));
  assert.ok(lines.includes('DTEND;TZID=Europe/Madrid:20260926T200000')); // +90 min
  assert.ok(lines.includes("SUMMARY:CFS LA SÉNIA - L'AMETLLA"));
});

test('generateIcs: UID stays stable when date/time/venue/status change (the whole point of using CODACTA)', () => {
  const before = buildMatch({ id: '4151650', startsAt: new Date('2026-09-26T16:30:00.000Z') });
  const after = buildMatch({
    id: '4151650',
    startsAt: new Date('2026-09-26T18:00:00.000Z'),
    venue: { name: 'Pavelló Nou', latitude: 41.0, longitude: 1.0 },
    status: 'postponed',
  });

  const icsBefore = unfoldIcs(generateIcs([before], { calendarName: 'X', now: FIXED_NOW }));
  const icsAfter = unfoldIcs(generateIcs([after], { calendarName: 'X', now: FIXED_NOW }));

  const uidBefore = findLine(icsBefore, 'UID:');
  const uidAfter = findLine(icsAfter, 'UID:');
  assert.equal(uidBefore, uidAfter);
  assert.equal(uidBefore, 'UID:fcf-4151650@partitsalcalendari.com');

  assert.notEqual(findLine(icsBefore, 'DTSTART;TZID='), findLine(icsAfter, 'DTSTART;TZID='));
});

test('generateIcs: two different matches (different CODACTA) get different UIDs', () => {
  const matchA = buildMatch({ id: '1111111' });
  const matchB = buildMatch({ id: '2222222' });
  const lines = unfoldIcs(generateIcs([matchA, matchB], { calendarName: 'X', now: FIXED_NOW }));

  assert.ok(lines.includes('UID:fcf-1111111@partitsalcalendari.com'));
  assert.ok(lines.includes('UID:fcf-2222222@partitsalcalendari.com'));
});

test('generateIcs: LOCATION and GEO are emitted when the match has a venue', () => {
  const match = buildMatch({ venue: { name: 'Pavelló Municipal', latitude: 40.6335, longitude: 0.2536 } });
  const lines = unfoldIcs(generateIcs([match], { calendarName: 'X', now: FIXED_NOW }));

  assert.ok(lines.includes('LOCATION:Pavelló Municipal'));
  assert.ok(lines.includes('GEO:40.6335;0.2536'));
});

test('generateIcs: no LOCATION/GEO at all when the match has no venue', () => {
  const match = buildMatch();
  const lines = unfoldIcs(generateIcs([match], { calendarName: 'X', now: FIXED_NOW }));

  assert.equal(findLine(lines, 'LOCATION:'), undefined);
  assert.equal(findLine(lines, 'GEO:'), undefined);
});

test('generateIcs: venue with a name but no coordinates gets LOCATION without GEO', () => {
  const match = buildMatch({ venue: { name: 'Pavelló Sin Coordenadas' } });
  const lines = unfoldIcs(generateIcs([match], { calendarName: 'X', now: FIXED_NOW }));

  assert.ok(lines.includes('LOCATION:Pavelló Sin Coordenadas'));
  assert.equal(findLine(lines, 'GEO:'), undefined);
});

test('generateIcs: special characters in team names and venue are escaped, never break the structure', () => {
  const match = buildMatch({
    homeTeam: { id: '1', name: "L'Ametlla; Team, Inc." },
    awayTeam: { id: '2', name: 'Sènia\\FC' },
    venue: { name: "Pavelló d'Esports; Zona Nord, Camp 2" },
  });
  const lines = unfoldIcs(generateIcs([match], { calendarName: 'X', now: FIXED_NOW }));

  const summary = findLine(lines, 'SUMMARY:');
  const location = findLine(lines, 'LOCATION:');
  assert.equal(summary, "SUMMARY:L'Ametlla\\; Team\\, Inc. - Sènia\\\\FC");
  assert.equal(location, "LOCATION:Pavelló d'Esports\\; Zona Nord\\, Camp 2");
});

test('generateIcs: folds a VEVENT line built from an unusually long team/venue name, and it still round-trips', () => {
  const longName = 'Club Esportiu ' + 'Molt Llarg '.repeat(10) + 'de Futbol Sala';
  const match = buildMatch({
    homeTeam: { id: '1', name: longName },
    awayTeam: { id: '2', name: 'Rival' },
  });
  const ics = generateIcs([match], { calendarName: 'X', now: FIXED_NOW });

  // Raw (folded) output must contain a continuation line.
  const rawLines = ics.split('\r\n');
  assert.ok(rawLines.some((line) => line.startsWith(' ')), 'expected at least one folded continuation line');

  // But once unfolded, the SUMMARY is still exactly what we expect.
  const lines = unfoldIcs(ics);
  assert.ok(findLine(lines, 'SUMMARY:')?.includes(longName));
});

test('generateIcs: STATUS reflects match status, and is omitted for "unknown"', () => {
  const scheduled = buildMatch({ id: '1', status: 'scheduled' });
  const cancelled = buildMatch({ id: '2', status: 'cancelled' });
  const unknown = buildMatch({ id: '3', status: 'unknown' });

  const linesScheduled = unfoldIcs(generateIcs([scheduled], { calendarName: 'X', now: FIXED_NOW }));
  const linesCancelled = unfoldIcs(generateIcs([cancelled], { calendarName: 'X', now: FIXED_NOW }));
  const linesUnknown = unfoldIcs(generateIcs([unknown], { calendarName: 'X', now: FIXED_NOW }));

  assert.ok(linesScheduled.includes('STATUS:CONFIRMED'));
  assert.ok(linesCancelled.includes('STATUS:CANCELLED'));
  assert.equal(findLine(linesUnknown, 'STATUS:'), undefined);
});

test('generateIcs: matchDurationMinutes is configurable and drives DTEND', () => {
  const match = buildMatch({ startsAt: new Date('2026-09-26T16:30:00.000Z') });
  const lines = unfoldIcs(
    generateIcs([match], { calendarName: 'X', now: FIXED_NOW, matchDurationMinutes: 60 }),
  );

  assert.ok(lines.includes('DTEND;TZID=Europe/Madrid:20260926T193000')); // 18:30 + 60min
});

test('generateIcs: uidDomain and prodId are configurable', () => {
  const match = buildMatch({ id: '42' });
  const lines = unfoldIcs(
    generateIcs([match], {
      calendarName: 'X',
      now: FIXED_NOW,
      uidDomain: 'example.org',
      prodId: '-//Custom//Test//EN',
    }),
  );

  assert.ok(lines.includes('UID:fcf-42@example.org'));
  assert.ok(lines.includes('PRODID:-//Custom//Test//EN'));
});

test('generateIcs: DTSTAMP and LAST-MODIFIED use the injected `now`', () => {
  const match = buildMatch();
  const lines = unfoldIcs(generateIcs([match], { calendarName: 'X', now: FIXED_NOW }));

  assert.ok(lines.includes('DTSTAMP:20260901T100000Z'));
  assert.ok(lines.includes('LAST-MODIFIED:20260901T100000Z'));
});

test('generateIcs: SEQUENCE is always 0 in the MVP (documented, no-persistence limitation)', () => {
  const match = buildMatch();
  const lines = unfoldIcs(generateIcs([match], { calendarName: 'X', now: FIXED_NOW }));
  assert.ok(lines.includes('SEQUENCE:0'));
});

test('generateIcs: an empty match list still produces a valid, empty calendar (no VEVENT)', () => {
  const ics = generateIcs([], { calendarName: 'CFS LA SÉNIA', now: FIXED_NOW });
  assert.ok(!ics.includes('BEGIN:VEVENT'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'));
  assert.ok(ics.trimEnd().endsWith('END:VCALENDAR'));
});

test('generateIcs: multiple matches each get their own VEVENT, in the order given', () => {
  const matchA = buildMatch({ id: 'A' });
  const matchB = buildMatch({ id: 'B' });
  const ics = generateIcs([matchA, matchB], { calendarName: 'X', now: FIXED_NOW });

  const beginCount = ics.split('BEGIN:VEVENT').length - 1;
  assert.equal(beginCount, 2);
  assert.ok(ics.indexOf('UID:fcf-A@') < ics.indexOf('UID:fcf-B@'));
});
