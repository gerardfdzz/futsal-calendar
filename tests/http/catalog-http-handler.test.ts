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
import { buildMatch } from '../fixtures/match.fixtures.js';
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

test('handleTeamsRequest: without a federation provider, teams have no crest (unchanged behavior)', async () => {
  const catalog = new FakeCompetitionCatalogProvider({ teams: [{ id: '54755993', name: 'CFS LA SÉNIA' }] });

  const response = await handleTeamsRequest(
    catalog,
    { method: 'GET', url: '/api/groups/58162580/teams' },
    noopHttpLogger,
  );

  assert.deepEqual(JSON.parse(response.body), [{ id: '54755993', name: 'CFS LA SÉNIA' }]);
});

test('handleTeamsRequest: enriches each team with its crest from the matches endpoint', async () => {
  const catalog = new FakeCompetitionCatalogProvider({
    teams: [
      { id: '54755993', name: 'CFS LA SÉNIA' },
      { id: '12345678', name: "L'AMETLLA" },
    ],
  });
  const federation = new FakeFederationProvider([
    buildMatch({
      homeTeam: { id: '54755993', name: 'CFS LA SÉNIA', crest: 'https://files.fcf.cat/escudos/clubes/escudos/a.png' },
      awayTeam: { id: '12345678', name: "L'AMETLLA", crest: 'https://files.fcf.cat/escudos/clubes/escudos/b.png' },
    }),
  ]);

  const response = await handleTeamsRequest(
    catalog,
    { method: 'GET', url: '/api/groups/58162580/teams' },
    noopHttpLogger,
    federation,
  );

  assert.deepEqual(federation.calledWithGroupIds, ['58162580']);
  assert.deepEqual(JSON.parse(response.body), [
    { id: '54755993', name: 'CFS LA SÉNIA', crest: 'https://files.fcf.cat/escudos/clubes/escudos/a.png' },
    { id: '12345678', name: "L'AMETLLA", crest: 'https://files.fcf.cat/escudos/clubes/escudos/b.png' },
  ]);
});

test('handleTeamsRequest: a team with no crest in the matches data is left as-is, never a made-up value', async () => {
  const catalog = new FakeCompetitionCatalogProvider({ teams: [{ id: '99999999', name: 'Sense partits encara' }] });
  const federation = new FakeFederationProvider([buildMatch()]);

  const response = await handleTeamsRequest(
    catalog,
    { method: 'GET', url: '/api/groups/58162580/teams' },
    noopHttpLogger,
    federation,
  );

  assert.deepEqual(JSON.parse(response.body), [{ id: '99999999', name: 'Sense partits encara' }]);
});

test('handleTeamsRequest: if fetching matches for crest enrichment fails, still returns the plain team list (200), never fails the request', async () => {
  const catalog = new FakeCompetitionCatalogProvider({ teams: [{ id: '54755993', name: 'CFS LA SÉNIA' }] });
  const federation = new FakeFederationProvider([], new Error('FCF is down'));

  const response = await handleTeamsRequest(
    catalog,
    { method: 'GET', url: '/api/groups/58162580/teams' },
    noopHttpLogger,
    federation,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), [{ id: '54755993', name: 'CFS LA SÉNIA' }]);
});

test('handleTeamsRequest: a withdrawn team (permanently "Descans" in the calendar) is excluded from the list', async () => {
  const catalog = new FakeCompetitionCatalogProvider({
    teams: [
      { id: '54755993', name: 'CFS LA SÉNIA' },
      { id: '51463150', name: 'FUNDACIO F. VILANOVA I LA GELTRÚ C' },
    ],
  });
  const federation = new FakeFederationProvider([], undefined, new Set(['51463150']));

  const response = await handleTeamsRequest(
    catalog,
    { method: 'GET', url: '/api/groups/58162580/teams' },
    noopHttpLogger,
    federation,
  );

  assert.deepEqual(federation.calledForWithdrawnTeamIds, ['58162580']);
  assert.deepEqual(JSON.parse(response.body), [{ id: '54755993', name: 'CFS LA SÉNIA' }]);
});

test('handleTeamsRequest: if fetching withdrawn team ids fails, still returns the full team list (200), never fails the request', async () => {
  const catalog = new FakeCompetitionCatalogProvider({ teams: [{ id: '54755993', name: 'CFS LA SÉNIA' }] });
  const federation = new FakeFederationProvider([], undefined, new Set(), new Error('FCF is down'));

  const response = await handleTeamsRequest(
    catalog,
    { method: 'GET', url: '/api/groups/58162580/teams' },
    noopHttpLogger,
    federation,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), [{ id: '54755993', name: 'CFS LA SÉNIA' }]);
});
