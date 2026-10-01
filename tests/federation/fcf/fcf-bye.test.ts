import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findWithdrawnTeamIds, isBye } from '../../../src/federation/fcf/fcf-bye.js';
import { buildByeMatchDto, buildFcfMatchDto } from '../../fixtures/fcf.fixtures.js';

test('isBye: true when the away side is the "-1" / Descans placeholder', () => {
  assert.equal(isBye(buildByeMatchDto()), true);
});

test('isBye: true when the home side is the "-1" / Descans placeholder', () => {
  const dto = buildFcfMatchDto({
    CODEQUIPO_CASA: '-1',
    NOMBRE_CASA: 'Descans',
    ESCUDO_CASA: null,
    CODCLUB_CASA: null,
  });
  assert.equal(isBye(dto), true);
});

test('isBye: false for a normal fixture between two real teams', () => {
  assert.equal(isBye(buildFcfMatchDto()), false);
});

test('isBye: falls back to matching the "Descans" name even if the code is unexpectedly different', () => {
  const dto = buildFcfMatchDto({ CODEQUIPO_FUERA: '0', NOMBRE_FUERA: 'Descans' });
  assert.equal(isBye(dto), true);
});

test('isBye: name check is case-insensitive and trims whitespace', () => {
  const dto = buildFcfMatchDto({ CODEQUIPO_FUERA: '99', NOMBRE_FUERA: '  DESCANS  ' });
  assert.equal(isBye(dto), true);
});

test('isBye: a team merely named similarly ("Descans FC") is not treated as a bye', () => {
  const dto = buildFcfMatchDto({ CODEQUIPO_FUERA: '99', NOMBRE_FUERA: 'Descans FC' });
  assert.equal(isBye(dto), false);
});

test('findWithdrawnTeamIds: a real team id whose own name has been replaced by "Descans" is withdrawn', () => {
  const dto = buildFcfMatchDto({ CODEQUIPO_CASA: '51463150', NOMBRE_CASA: 'Descans' });
  const withdrawn = findWithdrawnTeamIds({ '1': [dto] });
  assert.deepEqual([...withdrawn], ['51463150']);
});

test('findWithdrawnTeamIds: the generic "-1" bye placeholder is never itself reported as withdrawn', () => {
  const dto = buildByeMatchDto();
  const withdrawn = findWithdrawnTeamIds({ '1': [dto] });
  assert.deepEqual([...withdrawn], []);
});

test('findWithdrawnTeamIds: a normal fixture between two real teams withdraws nobody', () => {
  const withdrawn = findWithdrawnTeamIds({ '1': [buildFcfMatchDto()] });
  assert.deepEqual([...withdrawn], []);
});

test('findWithdrawnTeamIds: collects ids once each, across every jornada and from either side', () => {
  const response = {
    '1': [buildFcfMatchDto({ CODEQUIPO_CASA: '51463150', NOMBRE_CASA: 'Descans' })],
    '2': [buildFcfMatchDto({ CODEQUIPO_FUERA: '51463150', NOMBRE_FUERA: 'Descans' })],
    '3': [buildFcfMatchDto({ CODEQUIPO_CASA: '58252824', NOMBRE_CASA: 'Descans' })],
  };
  const withdrawn = findWithdrawnTeamIds(response);
  assert.deepEqual([...withdrawn].sort(), ['51463150', '58252824']);
});
