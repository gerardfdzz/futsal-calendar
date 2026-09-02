import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapFcfMatch } from '../../src/federation/fcf/fcf.mapper.js';
import { generateIcs } from '../../src/calendar/ics-generator.js';
import { buildFcfMatchDto } from '../fixtures/fcf.fixtures.js';

/**
 * End-to-end sanity check across the two milestones: real FCF DTO shape
 * (Milestone 1) -> domain Match -> ICS text (Milestone 2), using the same
 * CODACTA/date example from the project brief. Nothing else in the test
 * suite exercises both layers together.
 */
test('FCF DTO -> mapFcfMatch -> generateIcs produces the expected UID and local kickoff time', () => {
  const dto = buildFcfMatchDto({
    CODACTA: '4151650',
    CODEQUIPO_CASA: '54755993',
    NOMBRE_CASA: 'CFS LA SÉNIA',
    CODEQUIPO_FUERA: '50795143',
    NOMBRE_FUERA: 'AES LA SÉNIA-STOCKPLUS',
    COMIENZO1: '2026-09-26 18:30:00',
    CAMPO: "Pavelló Municipal d'Esports",
  });

  const match = mapFcfMatch(dto, 3);
  const ics = generateIcs([match], { calendarName: 'CFS LA SÉNIA', now: new Date('2026-09-01T10:00:00.000Z') });

  assert.ok(ics.includes('UID:fcf-4151650@partitsalcalendari.com'));
  assert.ok(ics.includes('DTSTART;TZID=Europe/Madrid:20260926T183000'));
  assert.ok(ics.includes("SUMMARY:CFS LA SÉNIA - AES LA SÉNIA-STOCKPLUS"));
  assert.ok(ics.includes("LOCATION:Pavelló Municipal d'Esports"));
  assert.ok(ics.includes('STATUS:CONFIRMED'));
});
