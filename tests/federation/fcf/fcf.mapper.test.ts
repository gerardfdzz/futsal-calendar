import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FcfMappingError, mapFcfMatch } from '../../../src/federation/fcf/fcf.mapper.js';
import { buildFcfMatchDto } from '../../fixtures/fcf.fixtures.js';

test('mapFcfMatch: maps a well-formed fixture end to end', () => {
  const dto = buildFcfMatchDto();
  const match = mapFcfMatch(dto, 3);

  assert.equal(match.id, '4151650');
  assert.equal(match.round, 3);
  assert.equal(match.groupId, '58162580');
  assert.equal(match.status, 'scheduled');
  assert.equal(match.startsAt.toISOString(), '2026-09-26T16:30:00.000Z');
});

test('mapFcfMatch: our target team as home side is mapped with the FCF code as id, never the name', () => {
  const dto = buildFcfMatchDto({ CODEQUIPO_CASA: '54755993', NOMBRE_CASA: '  CFS LA SÉNIA  ' });
  const match = mapFcfMatch(dto, 3);

  assert.equal(match.homeTeam.id, '54755993');
  assert.equal(match.homeTeam.name, 'CFS LA SÉNIA');
});

test('mapFcfMatch: our target team as away side is mapped correctly', () => {
  const dto = buildFcfMatchDto({ CODEQUIPO_FUERA: '54755993', NOMBRE_FUERA: 'CFS LA SÉNIA' });
  const match = mapFcfMatch(dto, 3);

  assert.equal(match.awayTeam.id, '54755993');
});

test('mapFcfMatch: two teams with overlapping names are distinguished by CODEQUIPO, not NOMBRE', () => {
  const dto = buildFcfMatchDto({
    CODEQUIPO_CASA: '54755993',
    NOMBRE_CASA: 'CFS LA SÉNIA',
    CODEQUIPO_FUERA: '50795143',
    NOMBRE_FUERA: 'AES LA SÉNIA-STOCKPLUS',
  });
  const match = mapFcfMatch(dto, 3);

  assert.equal(match.homeTeam.id, '54755993');
  assert.equal(match.awayTeam.id, '50795143');
  assert.notEqual(match.homeTeam.id, match.awayTeam.id);
});

test('mapFcfMatch: empty CAMPO results in no venue at all (not an empty-name Venue)', () => {
  const dto = buildFcfMatchDto({ CAMPO: '   ', LATITUD: '40.1', LONGITUD: '0.2', CODIGO_CAMPO: '9001' });
  const match = mapFcfMatch(dto, 3);

  assert.equal(match.venue, undefined);
});

test('mapFcfMatch: empty coordinates yield a venue with a name but no lat/lng', () => {
  const dto = buildFcfMatchDto({ CAMPO: 'Pavelló X', LATITUD: '', LONGITUD: '' });
  const match = mapFcfMatch(dto, 3);

  assert.ok(match.venue);
  assert.equal(match.venue?.name, 'Pavelló X');
  assert.equal(match.venue?.latitude, undefined);
  assert.equal(match.venue?.longitude, undefined);
});

test('mapFcfMatch: valid coordinates are parsed as numbers', () => {
  const dto = buildFcfMatchDto({ LATITUD: '40.6335', LONGITUD: '0.2536' });
  const match = mapFcfMatch(dto, 3);

  assert.equal(match.venue?.latitude, 40.6335);
  assert.equal(match.venue?.longitude, 0.2536);
});

test('mapFcfMatch: null crest becomes undefined, never the string "null"', () => {
  const dto = buildFcfMatchDto({ ESCUDO_CASA: null, ESCUDO_FUERA: null });
  const match = mapFcfMatch(dto, 3);

  assert.equal(match.homeTeam.crest, undefined);
  assert.equal(match.awayTeam.crest, undefined);
});

test('mapFcfMatch: null club id becomes undefined, never the string "null"', () => {
  const dto = buildFcfMatchDto({ CODCLUB_CASA: null, CODCLUB_FUERA: null });
  const match = mapFcfMatch(dto, 3);

  assert.equal(match.homeTeam.clubId, undefined);
  assert.equal(match.awayTeam.clubId, undefined);
});

test('mapFcfMatch: preserves special characters (accents, apostrophes) in names and venue', () => {
  const dto = buildFcfMatchDto({
    NOMBRE_CASA: "L'Ametlla de Mar",
    NOMBRE_FUERA: 'Sènia, C.F.',
    CAMPO: "Pavelló Municipal d'Esports; Zona Nord",
  });
  const match = mapFcfMatch(dto, 3);

  assert.equal(match.homeTeam.name, "L'Ametlla de Mar");
  assert.equal(match.awayTeam.name, 'Sènia, C.F.');
  assert.equal(match.venue?.name, "Pavelló Municipal d'Esports; Zona Nord");
});

test('mapFcfMatch: uses the jornada group key for round, not the (possibly stale) dto.JORNADA', () => {
  const dto = buildFcfMatchDto({ JORNADA: '2' });
  const match = mapFcfMatch(dto, 7);

  assert.equal(match.round, 7);
});

test('mapFcfMatch: throws FcfMappingError for an unparsable COMIENZO1, tagged with the CODACTA', () => {
  const dto = buildFcfMatchDto({ CODACTA: '999', COMIENZO1: 'not-a-date' });

  assert.throws(
    () => mapFcfMatch(dto, 3),
    (error: unknown) => error instanceof FcfMappingError && error.message.includes('999'),
  );
});
