import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapMatchStatusToIcsStatus } from '../../src/calendar/ics-status.mapper.js';

test('mapMatchStatusToIcsStatus: scheduled and finished both map to CONFIRMED', () => {
  assert.equal(mapMatchStatusToIcsStatus('scheduled'), 'CONFIRMED');
  assert.equal(mapMatchStatusToIcsStatus('finished'), 'CONFIRMED');
});

test('mapMatchStatusToIcsStatus: postponed maps to TENTATIVE', () => {
  assert.equal(mapMatchStatusToIcsStatus('postponed'), 'TENTATIVE');
});

test('mapMatchStatusToIcsStatus: cancelled maps to CANCELLED', () => {
  assert.equal(mapMatchStatusToIcsStatus('cancelled'), 'CANCELLED');
});

test('mapMatchStatusToIcsStatus: unknown maps to undefined (omit the property, never guess)', () => {
  assert.equal(mapMatchStatusToIcsStatus('unknown'), undefined);
});
