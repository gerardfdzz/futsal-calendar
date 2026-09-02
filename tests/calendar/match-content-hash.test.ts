import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMatchesContentHash } from '../../src/calendar/match-content-hash.js';
import { buildMatch } from '../fixtures/match.fixtures.js';

test('is stable across calls for identical input (deterministic, not time-based)', () => {
  const matches = [buildMatch()];
  const hashA = computeMatchesContentHash(matches, 'CFS LA SÉNIA');
  const hashB = computeMatchesContentHash(matches, 'CFS LA SÉNIA');
  assert.equal(hashA, hashB);
});

test('is quoted per RFC 7232 ETag syntax', () => {
  const hash = computeMatchesContentHash([buildMatch()], 'CFS LA SÉNIA');
  assert.ok(hash.startsWith('"'));
  assert.ok(hash.endsWith('"'));
});

test('changes when a match kickoff time changes', () => {
  const before = computeMatchesContentHash([buildMatch({ startsAt: new Date('2026-09-26T16:30:00.000Z') })], 'x');
  const after = computeMatchesContentHash([buildMatch({ startsAt: new Date('2026-09-26T18:00:00.000Z') })], 'x');
  assert.notEqual(before, after);
});

test('changes when venue changes', () => {
  const before = computeMatchesContentHash(
    [buildMatch({ venue: { name: 'Pavelló A' } })],
    'x',
  );
  const after = computeMatchesContentHash(
    [buildMatch({ venue: { name: 'Pavelló B' } })],
    'x',
  );
  assert.notEqual(before, after);
});

test('changes when status changes', () => {
  const before = computeMatchesContentHash([buildMatch({ status: 'scheduled' })], 'x');
  const after = computeMatchesContentHash([buildMatch({ status: 'postponed' })], 'x');
  assert.notEqual(before, after);
});

test('changes when calendar name changes, even with identical matches', () => {
  const matches = [buildMatch()];
  const before = computeMatchesContentHash(matches, 'CFS LA SÉNIA');
  const after = computeMatchesContentHash(matches, 'Other Name');
  assert.notEqual(before, after);
});

test('does not depend on any "now"/generation-time input (no such parameter exists)', () => {
  // Regression guard for the whole reason this module exists: unlike
  // generateIcs's DTSTAMP/LAST-MODIFIED, calling this twice a second
  // apart for the same data must produce the same hash.
  const matches = [buildMatch()];
  const hashA = computeMatchesContentHash(matches, 'x');
  const hashB = computeMatchesContentHash(matches, 'x');
  assert.equal(hashA, hashB);
});

test('is sensitive to match order (two matches swapped hash differently)', () => {
  const m1 = buildMatch({ id: 'a' });
  const m2 = buildMatch({ id: 'b', startsAt: new Date('2026-10-03T17:30:00.000Z') });
  const orderA = computeMatchesContentHash([m1, m2], 'x');
  const orderB = computeMatchesContentHash([m2, m1], 'x');
  assert.notEqual(orderA, orderB);
});

test('an empty match list still produces a valid, stable hash', () => {
  const hashA = computeMatchesContentHash([], 'FCF 54755993');
  const hashB = computeMatchesContentHash([], 'FCF 54755993');
  assert.equal(hashA, hashB);
  assert.ok(hashA.startsWith('"') && hashA.endsWith('"'));
});
