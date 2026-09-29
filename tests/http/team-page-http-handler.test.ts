import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleTeamPageRequest } from '../../src/http/team-page-http-handler.js';
import { noopHttpLogger } from '../../src/http/http-logger.js';
import { buildMatch } from '../fixtures/match.fixtures.js';
import { FakeFederationProvider } from '../fixtures/fake-federation-provider.js';
import { FakeCompetitionCatalogProvider } from '../fixtures/fake-competition-catalog-provider.js';

const GROUP_ID = '58162580';
const TEAM_ID = '54755993';

test('200: resolves the team name from the matches themselves (home leg) and renders real HTML', async () => {
  const federation = new FakeFederationProvider([
    buildMatch({ homeTeam: { id: TEAM_ID, name: 'CFS LA SÉNIA' }, awayTeam: { id: '2', name: 'RIVAL' } }),
  ]);

  const response = await handleTeamPageRequest(
    federation,
    undefined,
    { method: 'GET', url: `/api/team-page?groupId=${GROUP_ID}&teamId=${TEAM_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers['Content-Type'], 'text/html; charset=utf-8');
  assert.match(response.body, /CFS LA SÉNIA/);
});

test('200: resolves the team name from the away leg too', async () => {
  const federation = new FakeFederationProvider([
    buildMatch({ homeTeam: { id: '2', name: 'RIVAL' }, awayTeam: { id: TEAM_ID, name: 'CFS LA SÉNIA' } }),
  ]);

  const response = await handleTeamPageRequest(
    federation,
    undefined,
    { method: 'GET', url: `/api/team-page?groupId=${GROUP_ID}&teamId=${TEAM_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 200);
  assert.match(response.body, /CFS LA SÉNIA/);
});

test('200: falls back to the catalog for the team name when the team has no fixtures yet', async () => {
  const federation = new FakeFederationProvider([]);
  const catalog = new FakeCompetitionCatalogProvider({ teams: [{ id: TEAM_ID, name: 'CFS LA SÉNIA' }] });

  const response = await handleTeamPageRequest(
    federation,
    catalog,
    { method: 'GET', url: `/api/team-page?groupId=${GROUP_ID}&teamId=${TEAM_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 200);
  assert.match(response.body, /CFS LA SÉNIA/);
});

test('404: team not found in the matches nor in the catalog fallback', async () => {
  const federation = new FakeFederationProvider([]);
  const catalog = new FakeCompetitionCatalogProvider({ teams: [] });

  const response = await handleTeamPageRequest(
    federation,
    catalog,
    { method: 'GET', url: `/api/team-page?groupId=${GROUP_ID}&teamId=${TEAM_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 404);
});

test('404: team not found when no catalog fallback was even provided', async () => {
  const federation = new FakeFederationProvider([]);

  const response = await handleTeamPageRequest(
    federation,
    undefined,
    { method: 'GET', url: `/api/team-page?groupId=${GROUP_ID}&teamId=${TEAM_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 404);
});

test('502: the federation call fails, and a minimal but real HTML fallback is still served', async () => {
  const federation = new FakeFederationProvider([], new Error('FCF is down'));

  const response = await handleTeamPageRequest(
    federation,
    undefined,
    { method: 'GET', url: `/api/team-page?groupId=${GROUP_ID}&teamId=${TEAM_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 502);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.match(response.body, /<html/);
});

test('400: missing groupId or teamId query parameters', async () => {
  const federation = new FakeFederationProvider([]);

  const response = await handleTeamPageRequest(
    federation,
    undefined,
    { method: 'GET', url: `/api/team-page?groupId=${GROUP_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 400);
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

test('HEAD: same status as GET but an empty body', async () => {
  const federation = new FakeFederationProvider([
    buildMatch({ homeTeam: { id: TEAM_ID, name: 'CFS LA SÉNIA' }, awayTeam: { id: '2', name: 'RIVAL' } }),
  ]);

  const response = await handleTeamPageRequest(
    federation,
    undefined,
    { method: 'HEAD', url: `/api/team-page?groupId=${GROUP_ID}&teamId=${TEAM_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 200);
  assert.equal(response.body, '');
});
