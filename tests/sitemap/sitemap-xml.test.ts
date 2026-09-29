import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSitemapXml } from '../../src/sitemap/sitemap-xml.js';

test('renders the sitemap protocol root element and a loc for each entry', () => {
  const xml = buildSitemapXml([{ url: 'https://partitsalcalendari.com/' }]);

  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(xml, /<loc>https:\/\/partitsalcalendari\.com\/<\/loc>/);
  assert.match(xml, /<\/urlset>\s*$/);
});

test('includes lastmod, changefreq and priority only when provided', () => {
  const withExtras = buildSitemapXml([
    {
      url: 'https://partitsalcalendari.com/equip/1/2',
      lastModified: new Date('2026-09-15T10:00:00.000Z'),
      changeFrequency: 'daily',
      priority: 0.6,
    },
  ]);
  assert.match(withExtras, /<lastmod>2026-09-15<\/lastmod>/);
  assert.match(withExtras, /<changefreq>daily<\/changefreq>/);
  assert.match(withExtras, /<priority>0\.6<\/priority>/);

  const bare = buildSitemapXml([{ url: 'https://partitsalcalendari.com/equip/1/2' }]);
  assert.doesNotMatch(bare, /lastmod|changefreq|priority/);
});

test('XML-escapes special characters in the URL', () => {
  const xml = buildSitemapXml([{ url: "https://partitsalcalendari.com/equip/1&2/3'4" }]);
  assert.match(xml, /<loc>https:\/\/partitsalcalendari\.com\/equip\/1&amp;2\/3&apos;4<\/loc>/);
});

test('renders one <url> block per entry, in order', () => {
  const xml = buildSitemapXml([{ url: 'https://a.example/1' }, { url: 'https://a.example/2' }]);
  const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(matches, ['https://a.example/1', 'https://a.example/2']);
});
