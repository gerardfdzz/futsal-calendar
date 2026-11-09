import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleHealthRequest } from '../../src/http/health-http-handler.js';
import { noopHttpLogger } from '../../src/http/http-logger.js';
import { FakeCompetitionCatalogProvider } from '../fixtures/fake-competition-catalog-provider.js';
import { FakeFederationProvider } from '../fixtures/fake-federation-provider.js';
import { buildMatch } from '../fixtures/match.fixtures.js';

test('GET: 200 with status "discontinued", without ever calling the catalog or the federation', async () => {
  const catalog = new FakeCompetitionCatalogProvider({ disciplines: [{ id: '19308236', name: 'Futbol Sala' }] });
  const federation = new FakeFederationProvider([buildMatch()]);

  const response = await handleHealthRequest(catalog, federation, { method: 'GET', url: '/api/health' }, noopHttpLogger);
  const body = JSON.parse(response.body);

  assert.equal(response.status, 200);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(body.status, 'discontinued');
  assert.equal(catalog.calledWith.length, 0);
  assert.equal(federation.calledWithGroupIds.length, 0);
});

test('an unsupported method still returns 405', async () => {
  const catalog = new FakeCompetitionCatalogProvider();
  const federation = new FakeFederationProvider([]);

  const response = await handleHealthRequest(catalog, federation, { method: 'POST', url: '/api/health' }, noopHttpLogger);

  assert.equal(response.status, 405);
  assert.equal(response.headers['Allow'], 'GET, HEAD');
});

test('HEAD: 200 with an empty body', async () => {
  const catalog = new FakeCompetitionCatalogProvider();
  const federation = new FakeFederationProvider([]);

  const response = await handleHealthRequest(catalog, federation, { method: 'HEAD', url: '/api/health' }, noopHttpLogger);

  assert.equal(response.status, 200);
  assert.equal(response.body, '');
});
