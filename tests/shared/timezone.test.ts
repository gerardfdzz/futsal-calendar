import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getWallTimeComponents, zonedWallTimeToUtc } from '../../src/shared/timezone.js';

test('getWallTimeComponents: renders a UTC instant as Europe/Madrid wall time (CEST, UTC+2)', () => {
  const instant = new Date('2026-09-26T16:30:00.000Z');
  const wall = getWallTimeComponents(instant, 'Europe/Madrid');

  assert.deepEqual(wall, { year: 2026, month: 9, day: 26, hour: 18, minute: 30, second: 0 });
});

test('getWallTimeComponents: renders a UTC instant as Europe/Madrid wall time (CET, UTC+1)', () => {
  const instant = new Date('2026-01-15T17:30:00.000Z');
  const wall = getWallTimeComponents(instant, 'Europe/Madrid');

  assert.deepEqual(wall, { year: 2026, month: 1, day: 15, hour: 18, minute: 30, second: 0 });
});

test('zonedWallTimeToUtc <-> getWallTimeComponents round-trip for both CET and CEST', () => {
  const cases = [
    { year: 2026, month: 9, day: 26, hour: 18, minute: 30, second: 0 },
    { year: 2026, month: 1, day: 15, hour: 18, minute: 30, second: 0 },
    { year: 2026, month: 12, day: 24, hour: 20, minute: 0, second: 0 },
  ];

  for (const wall of cases) {
    const instant = zonedWallTimeToUtc(wall, 'Europe/Madrid');
    const roundTripped = getWallTimeComponents(instant, 'Europe/Madrid');
    assert.deepEqual(roundTripped, wall, `round-trip failed for ${JSON.stringify(wall)}`);
  }
});
