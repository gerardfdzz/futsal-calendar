import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  handleSitemapRequest,
  resetSitemapCacheForTests,
  seedSitemapCacheForTests,
} from '../../src/http/sitemap-http-handler.js';
import { noopHttpLogger } from '../../src/http/http-logger.js';
import { FakeCompetitionCatalogProvider } from '../fixtures/fake-competition-catalog-provider.js';

test('a fresh crawl is cached: a second request within the TTL does not re-query the catalog', async () => {
  resetSitemapCacheForTests();
  const catalog = new FakeCompetitionCatalogProvider({});

  const first = await handleSitemapRequest(catalog, { method: 'GET', url: '/sitemap.xml' }, noopHttpLogger);
  const callsAfterFirst = catalog.calledWith.length;
  assert.ok(callsAfterFirst > 0, 'expected the first request to actually crawl the catalog');

  const second = await handleSitemapRequest(catalog, { method: 'GET', url: '/sitemap.xml' }, noopHttpLogger);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(catalog.calledWith.length, callsAfterFirst, 'the second request should be served from cache');
  assert.equal(first.body, second.body);
});

test('with no cache yet and a failing crawl, falls back to a homepage-only sitemap instead of erroring', async () => {
  resetSitemapCacheForTests();
  const catalog = new FakeCompetitionCatalogProvider({}, new Error('FCF is down'));

  const response = await handleSitemapRequest(catalog, { method: 'GET', url: '/sitemap.xml' }, noopHttpLogger);

  assert.equal(response.status, 200);
  assert.match(response.body, /<loc>https:\/\/partitsalcalendari\.com\/<\/loc>/);
  assert.equal((response.body.match(/<url>/g) ?? []).length, 1);
});

test('once a crawl has succeeded, a later failing (and TTL-expired) crawl serves the last known-good sitemap instead of erroring', async () => {
  resetSitemapCacheForTests();
  const goodXml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://partitsalcalendari.com/equip/1/2</loc>\n  </url>\n</urlset>\n';
  const TWENTY_FOUR_HOURS_AGO = Date.now() - 24 * 60 * 60 * 1000;
  seedSitemapCacheForTests(goodXml, TWENTY_FOUR_HOURS_AGO);

  const catalog = new FakeCompetitionCatalogProvider({}, new Error('FCF is down'));
  const response = await handleSitemapRequest(catalog, { method: 'GET', url: '/sitemap.xml' }, noopHttpLogger);

  assert.equal(response.status, 200);
  assert.equal(response.body, goodXml, 'expected the stale-but-good cached sitemap, not the homepage-only fallback');
});

test('405: unsupported HTTP method', async () => {
  resetSitemapCacheForTests();
  const catalog = new FakeCompetitionCatalogProvider({});

  const response = await handleSitemapRequest(catalog, { method: 'POST', url: '/sitemap.xml' }, noopHttpLogger);
  assert.equal(response.status, 405);
});

test('HEAD: 200 with an empty body', async () => {
  resetSitemapCacheForTests();
  const catalog = new FakeCompetitionCatalogProvider({});

  const response = await handleSitemapRequest(catalog, { method: 'HEAD', url: '/sitemap.xml' }, noopHttpLogger);
  assert.equal(response.status, 200);
  assert.equal(response.body, '');
});
