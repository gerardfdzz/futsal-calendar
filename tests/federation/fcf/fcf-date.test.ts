import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FcfDateParseError, parseFcfDate } from '../../../src/federation/fcf/fcf-date.js';

test('parseFcfDate: resolves a CEST (summer, UTC+2) kickoff correctly', () => {
  const result = parseFcfDate('2026-09-26 18:30:00');
  assert.equal(result.toISOString(), '2026-09-26T16:30:00.000Z');
});

test('parseFcfDate: resolves a CET (winter, UTC+1) kickoff correctly', () => {
  const result = parseFcfDate('2026-01-15 18:30:00');
  assert.equal(result.toISOString(), '2026-01-15T17:30:00.000Z');
});

test('parseFcfDate: an updated kickoff time for the same match still resolves correctly', () => {
  const original = parseFcfDate('2026-09-26 18:30:00');
  const updated = parseFcfDate('2026-09-26 20:00:00');
  assert.notEqual(original.getTime(), updated.getTime());
  assert.equal(updated.toISOString(), '2026-09-26T18:00:00.000Z');
});

test('parseFcfDate: does not silently fall back to host-local / UTC interpretation', () => {
  const madrid = parseFcfDate('2026-09-26 18:30:00');
  const naiveAsUtc = new Date('2026-09-26T18:30:00.000Z');
  assert.notEqual(madrid.getTime(), naiveAsUtc.getTime());
});

test('parseFcfDate: trims surrounding whitespace', () => {
  const result = parseFcfDate('  2026-09-26 18:30:00  ');
  assert.equal(result.toISOString(), '2026-09-26T16:30:00.000Z');
});

test('parseFcfDate: also accepts a "T" separator, the format the FCF switched to for the 2026-27 season', () => {
  const result = parseFcfDate('2026-09-27T19:30:00');
  assert.equal(result.toISOString(), '2026-09-27T17:30:00.000Z');
});

test('parseFcfDate: "T"-separated and space-separated values for the same instant resolve identically', () => {
  const spaceSeparated = parseFcfDate('2026-09-27 19:30:00');
  const tSeparated = parseFcfDate('2026-09-27T19:30:00');
  assert.equal(spaceSeparated.getTime(), tSeparated.getTime());
});

test('parseFcfDate: a "T" separator does not open the door to a trailing timezone marker', () => {
  // Accepting "T" as a date/time separator must not be mistaken for accepting ISO 8601
  // wholesale — a trailing "Z" (or an offset) changes the meaning from "Europe/Madrid wall
  // clock" to "this exact UTC instant", so it must keep throwing just like it already does
  // for the space-separated format below.
  assert.throws(() => parseFcfDate('2026-09-27T19:30:00Z'), FcfDateParseError);
  assert.throws(() => parseFcfDate('2026-09-27T19:30:00+02:00'), FcfDateParseError);
});

test('parseFcfDate: throws FcfDateParseError for a format that does not match "YYYY-MM-DD HH:mm:ss"', () => {
  assert.throws(() => parseFcfDate('26/09/2026 18:30'), FcfDateParseError);
  assert.throws(() => parseFcfDate('2026-09-26T18:30:00Z'), FcfDateParseError);
  assert.throws(() => parseFcfDate(''), FcfDateParseError);
});

test('parseFcfDate: throws FcfDateParseError for out-of-range components', () => {
  assert.throws(() => parseFcfDate('2026-13-01 18:30:00'), FcfDateParseError);
  assert.throws(() => parseFcfDate('2026-09-26 25:30:00'), FcfDateParseError);
  assert.throws(() => parseFcfDate('2026-09-26 18:61:00'), FcfDateParseError);
});

test('parseFcfDate: is deterministic across the spring-forward gap (documented limitation, not "correctness")', () => {
  const first = parseFcfDate('2026-03-29 02:30:00');
  const second = parseFcfDate('2026-03-29 02:30:00');
  assert.equal(first.getTime(), second.getTime());
});

test('parseFcfDate: is deterministic across the fall-back ambiguous hour (documented limitation)', () => {
  const first = parseFcfDate('2026-10-25 02:30:00');
  const second = parseFcfDate('2026-10-25 02:30:00');
  assert.equal(first.getTime(), second.getTime());
});
