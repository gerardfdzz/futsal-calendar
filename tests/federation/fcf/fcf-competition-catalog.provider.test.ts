import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FcfCatalogProviderError,
  FcfCompetitionCatalogProvider,
} from '../../../src/federation/fcf/fcf-competition-catalog.provider.js';
import { noopFcfLogger } from '../../../src/federation/fcf/fcf-logger.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('listDisciplines: maps {value,label} pairs to Discipline[]', async () => {
  const fetchFn = async () => jsonResponse([{ value: '19308236', label: 'Futbol Sala' }]);
  const provider = new FcfCompetitionCatalogProvider({ fetchFn, logger: noopFcfLogger });

  const disciplines = await provider.listDisciplines();

  assert.deepEqual(disciplines, [{ id: '19308236', name: 'Futbol Sala' }]);
});

test('listCompetitions: builds the request URL with disciplinaId and temporada', async () => {
  let capturedUrl = '';
  const fetchFn = async (url: string) => {
    capturedUrl = url;
    return jsonResponse([{ value: '58162570', label: 'LLIGA SEGONA DIVISIÓ CATALANA FUTBOL SALA' }]);
  };
  const provider = new FcfCompetitionCatalogProvider({ fetchFn, logger: noopFcfLogger });

  const competitions = await provider.listCompetitions('19308236', '22');

  assert.equal(
    capturedUrl,
    'https://www.fcf.cat/api/competition/competicions?disciplinaId=19308236&temporada=22',
  );
  assert.deepEqual(competitions, [{ id: '58162570', name: 'LLIGA SEGONA DIVISIÓ CATALANA FUTBOL SALA' }]);
});

test('listGroups: builds the request URL with competicioId', async () => {
  let capturedUrl = '';
  const fetchFn = async (url: string) => {
    capturedUrl = url;
    return jsonResponse([{ value: '58162580', label: 'TGN Gr. 14' }]);
  };
  const provider = new FcfCompetitionCatalogProvider({ fetchFn, logger: noopFcfLogger });

  const groups = await provider.listGroups('58162570');

  assert.equal(capturedUrl, 'https://www.fcf.cat/api/competition/grupos?competicioId=58162570');
  assert.deepEqual(groups, [{ id: '58162580', name: 'TGN Gr. 14' }]);
});

test('listTeams: builds the request URL with grupId, deduplicates and sorts by name', async () => {
  let capturedUrl = '';
  const fetchFn = async (url: string) => {
    capturedUrl = url;
    return jsonResponse([
      { value: '50795143', label: 'AES LA SÉNIA-STOCKPLUS' },
      { value: '54755993', label: 'CFS LA SÉNIA' },
      { value: '50795143', label: 'AES LA SÉNIA-STOCKPLUS' }, // repeated, another jornada
    ]);
  };
  const provider = new FcfCompetitionCatalogProvider({ fetchFn, logger: noopFcfLogger });

  const teams = await provider.listTeams('58162580');

  assert.equal(capturedUrl, 'https://www.fcf.cat/api/competition/equipos?grupId=58162580');
  assert.deepEqual(teams, [
    { id: '50795143', name: 'AES LA SÉNIA-STOCKPLUS' },
    { id: '54755993', name: 'CFS LA SÉNIA' },
  ]);
});

test('rejects an empty id without making a request', async () => {
  let called = false;
  const fetchFn = async () => {
    called = true;
    return jsonResponse([]);
  };
  const provider = new FcfCompetitionCatalogProvider({ fetchFn, logger: noopFcfLogger });

  await assert.rejects(() => provider.listGroups('   '), FcfCatalogProviderError);
  assert.equal(called, false);
});

test('throws FcfCatalogProviderError for an unexpected response shape', async () => {
  const fetchFn = async () => jsonResponse({ not: 'an array' });
  const provider = new FcfCompetitionCatalogProvider({ fetchFn, logger: noopFcfLogger });

  await assert.rejects(() => provider.listDisciplines(), FcfCatalogProviderError);
});

test('throws FcfCatalogProviderError for an array with malformed entries', async () => {
  const fetchFn = async () => jsonResponse([{ value: '1' /* missing label */ }]);
  const provider = new FcfCompetitionCatalogProvider({ fetchFn, logger: noopFcfLogger });

  await assert.rejects(() => provider.listDisciplines(), FcfCatalogProviderError);
});

test('throws FcfCatalogProviderError when the upstream request ultimately fails', async () => {
  const fetchFn = async () => jsonResponse({}, 503);
  const provider = new FcfCompetitionCatalogProvider({
    fetchFn,
    maxRetries: 0,
    retryDelayMs: 1,
    logger: noopFcfLogger,
  });

  await assert.rejects(() => provider.listDisciplines(), FcfCatalogProviderError);
});
