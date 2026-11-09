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
import { FakeFederationProvider } from '../fixtures/fake-federation-provider.js';

test('handleDisciplinesRequest: 410 explaining the service is discontinued, without ever calling the catalog', async () => {
  const catalog = new FakeCompetitionCatalogProvider({ disciplines: [{ id: '19308236', name: 'Futbol Sala' }] });

  const response = await handleDisciplinesRequest(catalog, { method: 'GET', url: '/api/disciplines' }, noopHttpLogger);

  assert.equal(response.status, 410);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.match(response.body, /no autoritza/);
  assert.equal(catalog.calledWith.length, 0);
});

test('handleDisciplinesRequest: an unsupported method still returns 405', async () => {
  const catalog = new FakeCompetitionCatalogProvider();
  const response = await handleDisciplinesRequest(catalog, { method: 'POST', url: '/api/disciplines' }, noopHttpLogger);
  assert.equal(response.status, 405);
  assert.equal(response.headers['Allow'], 'GET, HEAD');
});

test('handleCompetitionsRequest: 410, without ever calling the catalog', async () => {
  const catalog = new FakeCompetitionCatalogProvider({ competitions: [] });

  const response = await handleCompetitionsRequest(catalog, { method: 'GET', url: '/api/competitions' }, noopHttpLogger);

  assert.equal(response.status, 410);
  assert.equal(catalog.calledWith.length, 0);
});

test('handleGroupsRequest: 410, without ever calling the catalog, even for a malformed path', async () => {
  const catalog = new FakeCompetitionCatalogProvider({ groups: [{ id: '58162580', name: 'TGN Gr. 14' }] });

  const response = await handleGroupsRequest(catalog, { method: 'GET', url: '/favicon.ico' }, noopHttpLogger);

  assert.equal(response.status, 410);
  assert.equal(catalog.calledWith.length, 0);
});

test('handleTeamsRequest: 410, without ever calling the catalog or the federation, even with crest enrichment requested', async () => {
  const catalog = new FakeCompetitionCatalogProvider({ teams: [{ id: '54755993', name: 'CFS LA SÉNIA' }] });
  const federation = new FakeFederationProvider([]);

  const response = await handleTeamsRequest(
    catalog,
    { method: 'GET', url: '/api/groups/58162580/teams' },
    noopHttpLogger,
    federation,
  );

  assert.equal(response.status, 410);
  assert.equal(catalog.calledWith.length, 0);
  assert.equal(federation.calledWithGroupIds.length, 0);
});

test('handleTeamsRequest: 405 for an unsupported method', async () => {
  const catalog = new FakeCompetitionCatalogProvider();

  const response = await handleTeamsRequest(catalog, { method: 'DELETE', url: '/api/groups/58162580/teams' }, noopHttpLogger);

  assert.equal(response.status, 405);
});
