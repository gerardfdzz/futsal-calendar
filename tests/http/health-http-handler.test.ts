import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleHealthRequest } from '../../src/http/health-http-handler.js';
import { noopHttpLogger } from '../../src/http/http-logger.js';
import { FakeCompetitionCatalogProvider } from '../fixtures/fake-competition-catalog-provider.js';
import { FakeFederationProvider } from '../fixtures/fake-federation-provider.js';
import { buildMatch } from '../fixtures/match.fixtures.js';

test('handleHealthRequest: 200 with status "ok" when both the catalog and the matches endpoint respond', async () => {
  const catalog = new FakeCompetitionCatalogProvider({ disciplines: [{ id: '19308236', name: 'Futbol Sala' }] });
  const federation = new FakeFederationProvider([buildMatch()]);

  const response = await handleHealthRequest(catalog, federation, { method: 'GET', url: '/api/health' }, noopHttpLogger);
  const body = JSON.parse(response.body);

  assert.equal(response.status, 200);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(body.status, 'ok');
  assert.deepEqual(body.checks.disciplines, { ok: true, count: 1 });
  assert.deepEqual(body.checks.matches, { ok: true, count: 1 });
});

test('handleHealthRequest: 503 when the FCF matches endpoint fails, same real-world symptom as the "unexpected shape" incident', async () => {
  const catalog = new FakeCompetitionCatalogProvider({ disciplines: [{ id: '19308236', name: 'Futbol Sala' }] });
  const federation = new FakeFederationProvider([], new Error('FCF endpoint returned an unexpected shape for groupId="58162580"'));

  const response = await handleHealthRequest(catalog, federation, { method: 'GET', url: '/api/health' }, noopHttpLogger);
  const body = JSON.parse(response.body);

  assert.equal(response.status, 503);
  assert.equal(body.status, 'down');
  assert.equal(body.checks.disciplines.ok, true);
  assert.equal(body.checks.matches.ok, false);
  assert.match(body.checks.matches.error, /unexpected shape/);
});

test('handleHealthRequest: 503 when the disciplines endpoint fails, even if matches still works', async () => {
  const catalog = new FakeCompetitionCatalogProvider({}, new Error('FCF endpoint returned HTTP 403 for disciplines'));
  const federation = new FakeFederationProvider([buildMatch()]);

  const response = await handleHealthRequest(catalog, federation, { method: 'GET', url: '/api/health' }, noopHttpLogger);
  const body = JSON.parse(response.body);

  assert.equal(response.status, 503);
  assert.equal(body.checks.disciplines.ok, false);
  assert.equal(body.checks.matches.ok, true);
});

test('handleHealthRequest: an unsupported method returns 405', async () => {
  const catalog = new FakeCompetitionCatalogProvider();
  const federation = new FakeFederationProvider([]);

  const response = await handleHealthRequest(catalog, federation, { method: 'POST', url: '/api/health' }, noopHttpLogger);

  assert.equal(response.status, 405);
  assert.equal(response.headers['Allow'], 'GET');
});
