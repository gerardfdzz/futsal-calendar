import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleTeamMatchesRequest } from '../../src/http/matches-http-handler.js';
import { noopHttpLogger } from '../../src/http/http-logger.js';
import { buildMatch } from '../fixtures/match.fixtures.js';
import { FakeFederationProvider } from '../fixtures/fake-federation-provider.js';

const HOME_ID = '54755993';

function providerWithOneMatch(): FakeFederationProvider {
  return new FakeFederationProvider([
    buildMatch({ homeTeam: { id: HOME_ID, name: 'CFS LA SÉNIA' }, awayTeam: { id: '2', name: 'X' } }),
  ]);
}

test('GET a valid route returns 200 with a JSON body and expected headers', async () => {
  const provider = providerWithOneMatch();

  const response = await handleTeamMatchesRequest(
    provider,
    { method: 'GET', url: `/api/matches/58162580/${HOME_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers['Content-Type'], 'application/json; charset=utf-8');
  assert.ok(response.headers['ETag']);
  assert.ok(response.headers['Cache-Control']?.includes('max-age='));

  const body = JSON.parse(response.body) as { matches: unknown[] };
  assert.equal(body.matches.length, 1);
});

test('HEAD a valid route returns 200 with the same headers but an empty body', async () => {
  const provider = providerWithOneMatch();

  const response = await handleTeamMatchesRequest(
    provider,
    { method: 'HEAD', url: `/api/matches/58162580/${HOME_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 200);
  assert.equal(response.body, '');
  assert.ok(response.headers['ETag']);
});

test('an unsupported method returns 405 with an Allow header', async () => {
  const provider = providerWithOneMatch();

  const response = await handleTeamMatchesRequest(
    provider,
    { method: 'POST', url: `/api/matches/58162580/${HOME_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers['Allow'], 'GET, HEAD');
});

test('a malformed path returns 400 without calling the provider', async () => {
  const provider = providerWithOneMatch();

  const response = await handleTeamMatchesRequest(provider, { method: 'GET', url: '/favicon.ico' }, noopHttpLogger);

  assert.equal(response.status, 400);
  assert.equal(provider.calledWithGroupIds.length, 0);
});

test('a matching If-None-Match returns 304 with no body', async () => {
  const provider = providerWithOneMatch();
  const url = `/api/matches/58162580/${HOME_ID}`;

  const first = await handleTeamMatchesRequest(provider, { method: 'GET', url }, noopHttpLogger);
  const etag = first.headers['ETag'];
  assert.ok(etag);

  const second = await handleTeamMatchesRequest(provider, { method: 'GET', url, ifNoneMatch: etag }, noopHttpLogger);

  assert.equal(second.status, 304);
  assert.equal(second.body, '');
});

test('a provider failure maps to 502 with an uncacheable response', async () => {
  const provider = new FakeFederationProvider([], new Error('FCF is down'));

  const response = await handleTeamMatchesRequest(
    provider,
    { method: 'GET', url: `/api/matches/58162580/${HOME_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 502);
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('a team with no matches still returns 200 with an empty matches array', async () => {
  const provider = new FakeFederationProvider([]);

  const response = await handleTeamMatchesRequest(
    provider,
    { method: 'GET', url: '/api/matches/58162580/99999999' },
    noopHttpLogger,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), { matches: [] });
});

test('different teams in the same group get different ETags for the same underlying data', async () => {
  const provider = new FakeFederationProvider([]);

  const teamA = await handleTeamMatchesRequest(
    provider,
    { method: 'GET', url: '/api/matches/58162580/54755993' },
    noopHttpLogger,
  );
  const teamB = await handleTeamMatchesRequest(
    provider,
    { method: 'GET', url: '/api/matches/58162580/50795143' },
    noopHttpLogger,
  );

  assert.notEqual(teamA.headers['ETag'], teamB.headers['ETag']);
});
