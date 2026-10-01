import type { CompetitionCatalogProvider } from '../federation/competition-catalog-provider.js';
import { crawlTeamPageUrls } from '../sitemap/sitemap-crawler.js';
import { buildSitemapXml, type SitemapEntry } from '../sitemap/sitemap-xml.js';
import { DEFAULT_UID_DOMAIN } from '../calendar/ics-config.js';
import { consoleHttpLogger, type HttpLogger } from './http-logger.js';

const ALLOWED_METHODS = ['GET', 'HEAD'];

const SITEMAP_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const SITEMAP_HTTP_CACHE_MAX_AGE_SECONDS = 6 * 60 * 60;

interface CachedSitemap {
  readonly xml: string;
  readonly generatedAt: number;
}

let cache: CachedSitemap | undefined;
let inFlightCrawl: Promise<CachedSitemap> | undefined;

export interface SitemapHttpRequest {
  readonly method: string | undefined;
  readonly url: string;
}

export interface SitemapHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export async function handleSitemapRequest(
  catalog: CompetitionCatalogProvider,
  request: SitemapHttpRequest,
  logger: HttpLogger = consoleHttpLogger,
): Promise<SitemapHttpResponse> {
  if (request.method === undefined || !ALLOWED_METHODS.includes(request.method.toUpperCase())) {
    return {
      status: 405,
      headers: { Allow: ALLOWED_METHODS.join(', '), 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Method Not Allowed',
    };
  }

  const xml = await getSitemapXml(catalog, logger);
  const isHead = request.method.toUpperCase() === 'HEAD';
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, max-age=${SITEMAP_HTTP_CACHE_MAX_AGE_SECONDS}`,
    },
    body: isHead ? '' : xml,
  };
}

async function getSitemapXml(catalog: CompetitionCatalogProvider, logger: HttpLogger): Promise<string> {
  if (cache && Date.now() - cache.generatedAt < SITEMAP_CACHE_TTL_MS) {
    return cache.xml;
  }

  if (!inFlightCrawl) {
    inFlightCrawl = generateSitemap(catalog, logger).finally(() => {
      inFlightCrawl = undefined;
    });
  }

  try {
    const fresh = await inFlightCrawl;
    cache = fresh;
    return fresh.xml;
  } catch (error) {
    logger.error('sitemap: crawl failed; serving the last known-good sitemap if there is one', {
      error: error instanceof Error ? error.message : String(error),
    });
    return cache?.xml ?? buildHomepageOnlySitemap();
  }
}

async function generateSitemap(catalog: CompetitionCatalogProvider, logger: HttpLogger): Promise<CachedSitemap> {
  const teamPages = await crawlTeamPageUrls(catalog, logger);
  const entries: SitemapEntry[] = [
    { url: `https://${DEFAULT_UID_DOMAIN}/`, changeFrequency: 'weekly', priority: 1.0 },
    ...teamPages.map((page): SitemapEntry => ({ url: page.url, changeFrequency: 'daily', priority: 0.6 })),
  ];
  return { xml: buildSitemapXml(entries), generatedAt: Date.now() };
}

function buildHomepageOnlySitemap(): string {
  return buildSitemapXml([{ url: `https://${DEFAULT_UID_DOMAIN}/`, changeFrequency: 'weekly', priority: 1.0 }]);
}

export function resetSitemapCacheForTests(): void {
  cache = undefined;
  inFlightCrawl = undefined;
}

export function seedSitemapCacheForTests(xml: string, generatedAt: number = Date.now()): void {
  cache = { xml, generatedAt };
}
