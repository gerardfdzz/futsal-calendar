import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleTeamPageRequest } from '../../src/http/team-page-http-handler.js';
import { noopHttpLogger } from '../../src/http/http-logger.js';
import { buildMatch } from '../fixtures/match.fixtures.js';
import { FakeFederationProvider } from '../fixtures/fake-federation-provider.js';
import { FakeCompetitionCatalogProvider } from '../fixtures/fake-competition-catalog-provider.js';

const GROUP_ID = '58162580';
const TEAM_ID = '54755993';

test('GET returns 410 explaining the service is discontinued, without ever calling the federation or the catalog', async () => {
  const federation = new FakeFederationProvider([
    buildMatch({ homeTeam: { id: TEAM_ID, name: 'CFS LA SÉNIA' }, awayTeam: { id: '2', name: 'RIVAL' } }),
  ]);
  const catalog = new FakeCompetitionCatalogProvider({ teams: [{ id: TEAM_ID, name: 'CFS LA SÉNIA' }] });

  const response = await handleTeamPageRequest(
    federation,
    catalog,
    { method: 'GET', url: `/api/team-page?groupId=${GROUP_ID}&teamId=${TEAM_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 410);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.match(response.body, /no autoritza/);
  assert.equal(federation.calledWithGroupIds.length, 0);
  assert.equal(catalog.calledWith.length, 0);
});

test('works the same without a catalog fallback provided at all', async () => {
  const federation = new FakeFederationProvider([]);

  const response = await handleTeamPageRequest(
    federation,
    undefined,
    { method: 'GET', url: `/api/team-page?groupId=${GROUP_ID}&teamId=${TEAM_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 410);
});

test('405: unsupported HTTP method', async () => {
  const federation = new FakeFederationProvider([]);

  const response = await handleTeamPageRequest(
    federation,
    undefined,
    { method: 'POST', url: `/api/team-page?groupId=${GROUP_ID}&teamId=${TEAM_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 405);
});

test('HEAD: same 410 status as GET', async () => {
  const federation = new FakeFederationProvider([
    buildMatch({ homeTeam: { id: TEAM_ID, name: 'CFS LA SÉNIA' }, awayTeam: { id: '2', name: 'RIVAL' } }),
  ]);

  const response = await handleTeamPageRequest(
    federation,
    undefined,
    { method: 'HEAD', url: `/api/team-page?groupId=${GROUP_ID}&teamId=${TEAM_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 410);
});

test('even a request with no groupId/teamId query params returns 410 now, since no query parsing happens at all', async () => {
  const federation = new FakeFederationProvider([]);

  const response = await handleTeamPageRequest(
    federation,
    undefined,
    { method: 'GET', url: '/api/team-page' },
    noopHttpLogger,
  );

  assert.equal(response.status, 410);
});
