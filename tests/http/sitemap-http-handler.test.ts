import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleSitemapRequest } from '../../src/http/sitemap-http-handler.js';
import { noopHttpLogger } from '../../src/http/http-logger.js';
import { FakeCompetitionCatalogProvider } from '../fixtures/fake-competition-catalog-provider.js';

test('GET: 200 with a homepage-only sitemap, without ever crawling the catalog', async () => {
  const catalog = new FakeCompetitionCatalogProvider({});

  const response = await handleSitemapRequest(catalog, { method: 'GET', url: '/sitemap.xml' }, noopHttpLogger);

  assert.equal(response.status, 200);
  assert.equal(response.headers['Content-Type'], 'application/xml; charset=utf-8');
  assert.match(response.body, /<loc>https:\/\/partitsalcalendari\.com\/<\/loc>/);
  assert.equal((response.body.match(/<url>/g) ?? []).length, 1);
  assert.equal(catalog.calledWith.length, 0);
});

test('405: unsupported HTTP method', async () => {
  const catalog = new FakeCompetitionCatalogProvider({});

  const response = await handleSitemapRequest(catalog, { method: 'POST', url: '/sitemap.xml' }, noopHttpLogger);
  assert.equal(response.status, 405);
});

test('HEAD: 200 with an empty body', async () => {
  const catalog = new FakeCompetitionCatalogProvider({});

  const response = await handleSitemapRequest(catalog, { method: 'HEAD', url: '/sitemap.xml' }, noopHttpLogger);
  assert.equal(response.status, 200);
  assert.equal(response.body, '');
});
