import type { CompetitionCatalogProvider } from '../federation/competition-catalog-provider.js';
import { buildSitemapXml } from '../sitemap/sitemap-xml.js';
import { DEFAULT_UID_DOMAIN } from '../calendar/ics-config.js';
import { consoleHttpLogger, type HttpLogger } from './http-logger.js';

const ALLOWED_METHODS = ['GET', 'HEAD'];
const SITEMAP_HTTP_CACHE_MAX_AGE_SECONDS = 6 * 60 * 60;

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
  _catalog: CompetitionCatalogProvider,
  request: SitemapHttpRequest,
  _logger: HttpLogger = consoleHttpLogger,
): Promise<SitemapHttpResponse> {
  if (request.method === undefined || !ALLOWED_METHODS.includes(request.method.toUpperCase())) {
    return {
      status: 405,
      headers: { Allow: ALLOWED_METHODS.join(', '), 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Method Not Allowed',
    };
  }

  const isHead = request.method.toUpperCase() === 'HEAD';
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, max-age=${SITEMAP_HTTP_CACHE_MAX_AGE_SECONDS}`,
    },
    body: isHead ? '' : buildHomepageOnlySitemap(),
  };
}

function buildHomepageOnlySitemap(): string {
  return buildSitemapXml([{ url: `https://${DEFAULT_UID_DOMAIN}/`, changeFrequency: 'weekly', priority: 1.0 }]);
}
