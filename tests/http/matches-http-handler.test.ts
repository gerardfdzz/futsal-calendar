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

test('GET returns 410 explaining the service is discontinued, without ever calling the provider', async () => {
  const provider = providerWithOneMatch();

  const response = await handleTeamMatchesRequest(
    provider,
    { method: 'GET', url: `/api/matches/58162580/${HOME_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 410);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.match(response.body, /no autoritza/);
  assert.equal(provider.calledWithGroupIds.length, 0);
});

test('HEAD returns 410 too, without ever calling the provider', async () => {
  const provider = providerWithOneMatch();

  const response = await handleTeamMatchesRequest(
    provider,
    { method: 'HEAD', url: `/api/matches/58162580/${HOME_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 410);
  assert.equal(provider.calledWithGroupIds.length, 0);
});

test('an unsupported method still returns 405 with an Allow header', async () => {
  const provider = providerWithOneMatch();

  const response = await handleTeamMatchesRequest(
    provider,
    { method: 'POST', url: `/api/matches/58162580/${HOME_ID}` },
    noopHttpLogger,
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers['Allow'], 'GET, HEAD');
});

test('even a malformed path returns 410 now, since no route parsing or federation call happens at all', async () => {
  const provider = providerWithOneMatch();

  const response = await handleTeamMatchesRequest(provider, { method: 'GET', url: '/favicon.ico' }, noopHttpLogger);

  assert.equal(response.status, 410);
  assert.equal(provider.calledWithGroupIds.length, 0);
});
