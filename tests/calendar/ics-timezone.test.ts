import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMadridLocalDateTime, formatUtcDateTime, MADRID_VTIMEZONE_LINES } from '../../src/calendar/ics-timezone.js';
import { parseFcfDate } from '../../src/federation/fcf/fcf-date.js';

test('formatMadridLocalDateTime: renders CEST (summer) kickoff correctly', () => {
  const instant = new Date('2026-09-26T16:30:00.000Z');
  assert.equal(formatMadridLocalDateTime(instant), '20260926T183000');
});

test('formatMadridLocalDateTime: renders CET (winter) kickoff correctly', () => {
  const instant = new Date('2026-01-15T17:30:00.000Z');
  assert.equal(formatMadridLocalDateTime(instant), '20260115T183000');
});

test('formatMadridLocalDateTime: round-trips with parseFcfDate (the inverse conversion)', () => {
  const raw = '2026-09-26 18:30:00';
  const instant = parseFcfDate(raw);
  assert.equal(formatMadridLocalDateTime(instant), '20260926T183000');
});

test('formatUtcDateTime: renders an instant with a trailing Z', () => {
  const instant = new Date('2026-09-26T16:30:05.000Z');
  assert.equal(formatUtcDateTime(instant), '20260926T163005Z');
});

test('formatUtcDateTime: zero-pads single-digit components', () => {
  const instant = new Date('2026-01-05T03:04:05.000Z');
  assert.equal(formatUtcDateTime(instant), '20260105T030405Z');
});

test('MADRID_VTIMEZONE_LINES: declares the TZID and both DST transition rules', () => {
  const block = MADRID_VTIMEZONE_LINES.join('\n');
  assert.match(block, /TZID:Europe\/Madrid/);
  assert.match(block, /BEGIN:DAYLIGHT/);
  assert.match(block, /TZNAME:CEST/);
  assert.match(block, /RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU/);
  assert.match(block, /BEGIN:STANDARD/);
  assert.match(block, /TZNAME:CET/);
  assert.match(block, /RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU/);
  assert.equal(MADRID_VTIMEZONE_LINES[0], 'BEGIN:VTIMEZONE');
  assert.equal(MADRID_VTIMEZONE_LINES[MADRID_VTIMEZONE_LINES.length - 1], 'END:VTIMEZONE');
});
