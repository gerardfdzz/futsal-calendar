import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FcfDateParseError, parseFcfDate } from '../../../src/federation/fcf/fcf-date.js';

test('parseFcfDate: resolves a CEST (summer, UTC+2) kickoff correctly', () => {
  // 2026-09-26 is well within Europe/Madrid's DST window (ends 2026-10-25).
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
  // Sanity check that we are NOT just doing `new Date(raw)` under the hood:
  // that would parse as UTC or host-local depending on runtime, never
  // consistently as Europe/Madrid.
  const madrid = parseFcfDate('2026-09-26 18:30:00');
  const naiveAsUtc = new Date('2026-09-26T18:30:00.000Z');
  assert.notEqual(madrid.getTime(), naiveAsUtc.getTime());
});

test('parseFcfDate: trims surrounding whitespace', () => {
  const result = parseFcfDate('  2026-09-26 18:30:00  ');
  assert.equal(result.toISOString(), '2026-09-26T16:30:00.000Z');
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
  // Europe/Madrid springs forward on the last Sunday of March 2026 (29th):
  // 02:00 CET -> 03:00 CEST. 02:30 does not exist that day. We only assert
  // the function does not throw and always returns the same instant for
  // the same input — not that this is "the" right answer, because there
  // isn't one.
  const first = parseFcfDate('2026-03-29 02:30:00');
  const second = parseFcfDate('2026-03-29 02:30:00');
  assert.equal(first.getTime(), second.getTime());
});

test('parseFcfDate: is deterministic across the fall-back ambiguous hour (documented limitation)', () => {
  // Europe/Madrid falls back on the last Sunday of October 2026 (25th):
  // 03:00 CEST -> 02:00 CET, so 02:30 happens twice. Same caveat as above.
  const first = parseFcfDate('2026-10-25 02:30:00');
  const second = parseFcfDate('2026-10-25 02:30:00');
  assert.equal(first.getTime(), second.getTime());
});
