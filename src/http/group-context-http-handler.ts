import type { CompetitionCatalogProvider } from '../federation/competition-catalog-provider.js';
import { buildGroupContextIndex, type GroupContext } from '../catalog/group-context.js';
import { consoleHttpLogger, type HttpLogger } from './http-logger.js';
import { InvalidRouteError, parseGroupContextRoute } from './catalog-route.js';

const ALLOWED_METHODS = ['GET', 'HEAD'];

// Building the index walks the FCF catalog hundreds of times over (see
// src/catalog/group-context.ts), so — same reasoning as the sitemap crawl
// (src/http/sitemap-http-handler.ts) — it must not run on every request. Deliberately
// just an in-memory module variable, not a database: matches the project's existing
// "no persistence for now" stance (see README "Design decisions"), at the cost of
// resetting on cold starts.
const GROUP_CONTEXT_CACHE_TTL_MS = 60 * 60 * 1000;
const GROUP_CONTEXT_HTTP_CACHE_MAX_AGE_SECONDS = 60 * 60;

interface CachedIndex {
  readonly index: ReadonlyMap<string, GroupContext>;
  readonly generatedAt: number;
}

let cache: CachedIndex | undefined;
let inFlightBuild: Promise<CachedIndex> | undefined;

export interface JsonHttpRequest {
  readonly method: string | undefined;
  readonly url: string;
}

export interface JsonHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export async function handleGroupContextRequest(
  catalog: CompetitionCatalogProvider,
  request: JsonHttpRequest,
  logger: HttpLogger = consoleHttpLogger,
): Promise<JsonHttpResponse> {
  const methodError = checkMethod(request.method);
  if (methodError) return methodError;

  let grupId: string;
  try {
    ({ grupId } = parseGroupContextRoute(request.url));
  } catch (error) {
    return routeError(error);
  }

  let index: ReadonlyMap<string, GroupContext>;
  try {
    index = await getIndex(catalog, logger);
  } catch (error) {
    logger.error('group-context: failed to build the catalog index', { error: errorMessage(error) });
    return {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      body: 'Failed to fetch data from the federation. Please try again shortly.',
    };
  }

  const context = index.get(grupId);
  if (!context) {
    return {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      body: `No competition/discipline context found for groupId "${grupId}".`,
    };
  }

  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${GROUP_CONTEXT_HTTP_CACHE_MAX_AGE_SECONDS}`,
    },
    body: JSON.stringify(context),
  };
}

async function getIndex(catalog: CompetitionCatalogProvider, logger: HttpLogger): Promise<ReadonlyMap<string, GroupContext>> {
  if (cache && Date.now() - cache.generatedAt < GROUP_CONTEXT_CACHE_TTL_MS) {
    return cache.index;
  }

  if (!inFlightBuild) {
    inFlightBuild = buildGroupContextIndex(catalog, logger)
      .then((index): CachedIndex => ({ index, generatedAt: Date.now() }))
      .finally(() => {
        inFlightBuild = undefined;
      });
  }

  try {
    const fresh = await inFlightBuild;
    cache = fresh;
    return fresh.index;
  } catch (error) {
    if (cache) {
      logger.error('group-context: rebuild failed; serving the last known-good index', {
        error: errorMessage(error),
      });
      return cache.index;
    }
    throw error;
  }
}

function checkMethod(method: string | undefined): JsonHttpResponse | undefined {
  if (method === undefined || !ALLOWED_METHODS.includes(method.toUpperCase())) {
    return {
      status: 405,
      headers: { Allow: ALLOWED_METHODS.join(', '), 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Method Not Allowed',
    };
  }
  return undefined;
}

function routeError(error: unknown): JsonHttpResponse {
  if (error instanceof InvalidRouteError) {
    return { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: error.message };
  }
  throw error;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Test-only: the module-level cache above is a deliberate singleton (see comment near
 * its declaration), which means tests must reset it between cases instead of re-importing
 * the module. Not used outside tests/. */
export function resetGroupContextCacheForTests(): void {
  cache = undefined;
  inFlightBuild = undefined;
}

/** Test-only: seeds the cache directly (optionally with an old `generatedAt`) so a test
 * can exercise the "serve the last known-good index" fallback without waiting out the
 * real TTL. Not used outside tests/. */
export function seedGroupContextCacheForTests(index: ReadonlyMap<string, GroupContext>, generatedAt: number = Date.now()): void {
  cache = { index, generatedAt };
}
