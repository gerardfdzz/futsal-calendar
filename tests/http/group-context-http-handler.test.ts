import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  handleGroupContextRequest,
  resetGroupContextCacheForTests,
  seedGroupContextCacheForTests,
} from '../../src/http/group-context-http-handler.js';
import { noopHttpLogger } from '../../src/http/http-logger.js';
import { SITEMAP_DISCIPLINA_IDS } from '../../src/federation/fcf/fcf-catalog-config.js';
import { KeyedCompetitionCatalogProvider } from '../fixtures/keyed-competition-catalog-provider.js';

const [FUTSAL_ID] = SITEMAP_DISCIPLINA_IDS;

function catalogWithOneGroup(): KeyedCompetitionCatalogProvider {
  return new KeyedCompetitionCatalogProvider({
    disciplines: [{ id: FUTSAL_ID, name: 'Futbol Sala' }],
    competitionsByDisciplinaId: new Map([[FUTSAL_ID, [{ id: 'compA', name: 'Primera Divisió Nacional' }]]]),
    groupsByCompeticioId: new Map([['compA', [{ id: 'g1', name: 'TGN Gr. 14' }]]]),
  });
}

test('200 with the discipline/competition/group JSON when the group is found', async () => {
  resetGroupContextCacheForTests();
  const catalog = catalogWithOneGroup();

  const response = await handleGroupContextRequest(
    catalog,
    { method: 'GET', url: '/api/groups/g1/context' },
    noopHttpLogger,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers['Content-Type'], 'application/json; charset=utf-8');
  assert.deepEqual(JSON.parse(response.body), {
    discipline: { id: FUTSAL_ID, name: 'Futbol Sala' },
    competition: { id: 'compA', name: 'Primera Divisió Nacional' },
    group: { id: 'g1', name: 'TGN Gr. 14' },
  });
});

test('404 when the groupId is not found in the catalog', async () => {
  resetGroupContextCacheForTests();
  const catalog = catalogWithOneGroup();

  const response = await handleGroupContextRequest(
    catalog,
    { method: 'GET', url: '/api/groups/does-not-exist/context' },
    noopHttpLogger,
  );

  assert.equal(response.status, 404);
});

test('the built index is cached: a second request within the TTL does not re-walk the catalog', async () => {
  resetGroupContextCacheForTests();
  const catalog = catalogWithOneGroup();

  await handleGroupContextRequest(catalog, { method: 'GET', url: '/api/groups/g1/context' }, noopHttpLogger);
  const callsAfterFirst = catalog.calls.length;
  assert.ok(callsAfterFirst > 0, 'expected the first request to actually walk the catalog');

  await handleGroupContextRequest(catalog, { method: 'GET', url: '/api/groups/g1/context' }, noopHttpLogger);

  assert.equal(catalog.calls.length, callsAfterFirst, 'the second request should be served from cache');
});

test('once an index has been built, a later failing (and TTL-expired) rebuild serves the last known-good index', async () => {
  const goodIndex = new Map([
    ['g1', { discipline: { id: FUTSAL_ID, name: 'Futbol Sala' }, competition: { id: 'compA', name: 'Comp A' }, group: { id: 'g1', name: 'Group 1' } }],
  ]);
  const TWENTY_FOUR_HOURS_AGO = Date.now() - 24 * 60 * 60 * 1000;
  seedGroupContextCacheForTests(goodIndex, TWENTY_FOUR_HOURS_AGO);

  const failingCatalog = new KeyedCompetitionCatalogProvider({ errorOn: { method: 'listCompetitions' } });
  const response = await handleGroupContextRequest(
    failingCatalog,
    { method: 'GET', url: '/api/groups/g1/context' },
    noopHttpLogger,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), goodIndex.get('g1'));
});

test('400: malformed route', async () => {
  resetGroupContextCacheForTests();
  const catalog = catalogWithOneGroup();

  const response = await handleGroupContextRequest(catalog, { method: 'GET', url: '/api/groups/g1/teams' }, noopHttpLogger);
  assert.equal(response.status, 400);
});

test('405: unsupported HTTP method', async () => {
  resetGroupContextCacheForTests();
  const catalog = catalogWithOneGroup();

  const response = await handleGroupContextRequest(catalog, { method: 'POST', url: '/api/groups/g1/context' }, noopHttpLogger);
  assert.equal(response.status, 405);
});
