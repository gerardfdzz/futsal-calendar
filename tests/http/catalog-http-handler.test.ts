import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  handleCompetitionsRequest,
  handleDisciplinesRequest,
  handleGroupsRequest,
  handleTeamsRequest,
} from '../../src/http/catalog-http-handler.js';
import { noopHttpLogger } from '../../src/http/http-logger.js';
import { FakeCompetitionCatalogProvider } from '../fixtures/fake-competition-catalog-provider.js';
import { DEFAULT_DISCIPLINA_ID, DEFAULT_TEMPORADA_ID } from '../../src/federation/fcf/fcf-catalog-config.js';

test('handleDisciplinesRequest: 200 with the catalog JSON', async () => {
  const catalog = new FakeCompetitionCatalogProvider({ disciplines: [{ id: '19308236', name: 'Futbol Sala' }] });

  const response = await handleDisciplinesRequest(catalog, { method: 'GET', url: '/api/disciplines' }, noopHttpLogger);

  assert.equal(response.status, 200);
  assert.equal(response.headers['Content-Type'], 'application/json; charset=utf-8');
  assert.deepEqual(JSON.parse(response.body), [{ id: '19308236', name: 'Futbol Sala' }]);
});

test('handleDisciplinesRequest: an unsupported method returns 405', async () => {
  const catalog = new FakeCompetitionCatalogProvider();
  const response = await handleDisciplinesRequest(catalog, { method: 'POST', url: '/api/disciplines' }, noopHttpLogger);
  assert.equal(response.status, 405);
  assert.equal(response.headers['Allow'], 'GET, HEAD');
});

test('handleDisciplinesRequest: an upstream failure maps to 502, uncacheable', async () => {
  const catalog = new FakeCompetitionCatalogProvider({}, new Error('FCF is down'));
  const response = await handleDisciplinesRequest(catalog, { method: 'GET', url: '/api/disciplines' }, noopHttpLogger);
  assert.equal(response.status, 502);
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('handleCompetitionsRequest: applies defaults when disciplinaId/temporada are omitted', async () => {
  const catalog = new FakeCompetitionCatalogProvider({ competitions: [] });

  await handleCompetitionsRequest(catalog, { method: 'GET', url: '/api/competitions' }, noopHttpLogger);

  assert.deepEqual(catalog.calledWith, [
    { method: 'listCompetitions', args: [DEFAULT_DISCIPLINA_ID, DEFAULT_TEMPORADA_ID] },
  ]);
});

test('handleCompetitionsRequest: uses the query params when present', async () => {
  const catalog = new FakeCompetitionCatalogProvider({ competitions: [] });

  await handleCompetitionsRequest(
    catalog,
    { method: 'GET', url: '/api/competitions?disciplinaId=19308233&temporada=21' },
    noopHttpLogger,
  );

  assert.deepEqual(catalog.calledWith, [{ method: 'listCompetitions', args: ['19308233', '21'] }]);
});

test('handleGroupsRequest: 200 with the groups for the parsed competicioId', async () => {
  const catalog = new FakeCompetitionCatalogProvider({ groups: [{ id: '58162580', name: 'TGN Gr. 14' }] });

  const response = await handleGroupsRequest(
    catalog,
    { method: 'GET', url: '/api/competitions/58162570/groups' },
    noopHttpLogger,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(catalog.calledWith, [{ method: 'listGroups', args: ['58162570'] }]);
  assert.deepEqual(JSON.parse(response.body), [{ id: '58162580', name: 'TGN Gr. 14' }]);
});

test('handleGroupsRequest: a malformed path returns 400 without calling the provider', async () => {
  const catalog = new FakeCompetitionCatalogProvider();

  const response = await handleGroupsRequest(catalog, { method: 'GET', url: '/favicon.ico' }, noopHttpLogger);

  assert.equal(response.status, 400);
  assert.equal(catalog.calledWith.length, 0);
});

test('handleTeamsRequest: 200 with the teams for the parsed grupId', async () => {
  const catalog = new FakeCompetitionCatalogProvider({ teams: [{ id: '54755993', name: 'CFS LA SÉNIA' }] });

  const response = await handleTeamsRequest(
    catalog,
    { method: 'GET', url: '/api/groups/58162580/teams' },
    noopHttpLogger,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(catalog.calledWith, [{ method: 'listTeams', args: ['58162580'] }]);
  assert.deepEqual(JSON.parse(response.body), [{ id: '54755993', name: 'CFS LA SÉNIA' }]);
});

test('handleTeamsRequest: a malformed path returns 400 without calling the provider', async () => {
  const catalog = new FakeCompetitionCatalogProvider();

  const response = await handleTeamsRequest(catalog, { method: 'GET', url: '/api/groups/58162580' }, noopHttpLogger);

  assert.equal(response.status, 400);
  assert.equal(catalog.calledWith.length, 0);
});
