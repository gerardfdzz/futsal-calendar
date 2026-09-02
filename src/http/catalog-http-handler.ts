import type { CompetitionCatalogProvider } from '../federation/competition-catalog-provider.js';
import { DEFAULT_DISCIPLINA_ID, DEFAULT_TEMPORADA_ID } from '../federation/fcf/fcf-catalog-config.js';
import {
  InvalidRouteError,
  parseCompetitionsQuery,
  parseGroupsRoute,
  parseTeamsRoute,
} from './catalog-route.js';
import { consoleHttpLogger, type HttpLogger } from './http-logger.js';

const ALLOWED_METHODS = ['GET', 'HEAD'];

/** The catalog (disciplines/competicions/grups/equips) barely changes
 *  within a season, and unlike the calendar endpoint there's no
 *  per-subscriber caching client to keep honest with ETag/304 — the only
 *  consumer is our own Angular frontend — so a plain, longer max-age is
 *  enough here. */
const CATALOG_CACHE_MAX_AGE_SECONDS = 60 * 60;

export interface JsonHttpRequest {
  readonly method: string | undefined;
  readonly url: string;
}

export interface JsonHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

/** `GET /api/disciplines` */
export async function handleDisciplinesRequest(
  catalog: CompetitionCatalogProvider,
  request: JsonHttpRequest,
  logger: HttpLogger = consoleHttpLogger,
): Promise<JsonHttpResponse> {
  const methodError = checkMethod(request.method);
  if (methodError) return methodError;

  try {
    return jsonOk(await catalog.listDisciplines());
  } catch (error) {
    return upstreamError(logger, 'disciplines', error);
  }
}

/** `GET /api/competitions?disciplinaId=&temporada=` (both optional, default
 *  to Futbol Sala / the current season). */
export async function handleCompetitionsRequest(
  catalog: CompetitionCatalogProvider,
  request: JsonHttpRequest,
  logger: HttpLogger = consoleHttpLogger,
): Promise<JsonHttpResponse> {
  const methodError = checkMethod(request.method);
  if (methodError) return methodError;

  const query = parseCompetitionsQuery(request.url);
  const disciplinaId = nonEmptyOrDefault(query.disciplinaId, DEFAULT_DISCIPLINA_ID);
  const temporada = nonEmptyOrDefault(query.temporada, DEFAULT_TEMPORADA_ID);

  try {
    return jsonOk(await catalog.listCompetitions(disciplinaId, temporada));
  } catch (error) {
    return upstreamError(logger, `competicions (disciplinaId="${disciplinaId}", temporada="${temporada}")`, error);
  }
}

/** `GET /api/competitions/{competicioId}/groups` */
export async function handleGroupsRequest(
  catalog: CompetitionCatalogProvider,
  request: JsonHttpRequest,
  logger: HttpLogger = consoleHttpLogger,
): Promise<JsonHttpResponse> {
  const methodError = checkMethod(request.method);
  if (methodError) return methodError;

  let competicioId: string;
  try {
    ({ competicioId } = parseGroupsRoute(request.url));
  } catch (error) {
    return routeError(error);
  }

  try {
    return jsonOk(await catalog.listGroups(competicioId));
  } catch (error) {
    return upstreamError(logger, `grupos (competicioId="${competicioId}")`, error);
  }
}

/** `GET /api/groups/{grupId}/teams` */
export async function handleTeamsRequest(
  catalog: CompetitionCatalogProvider,
  request: JsonHttpRequest,
  logger: HttpLogger = consoleHttpLogger,
): Promise<JsonHttpResponse> {
  const methodError = checkMethod(request.method);
  if (methodError) return methodError;

  let grupId: string;
  try {
    ({ grupId } = parseTeamsRoute(request.url));
  } catch (error) {
    return routeError(error);
  }

  try {
    return jsonOk(await catalog.listTeams(grupId));
  } catch (error) {
    return upstreamError(logger, `equipos (grupId="${grupId}")`, error);
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

function jsonOk(data: unknown): JsonHttpResponse {
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${CATALOG_CACHE_MAX_AGE_SECONDS}`,
    },
    body: JSON.stringify(data),
  };
}

function routeError(error: unknown): JsonHttpResponse {
  if (error instanceof InvalidRouteError) {
    return { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: error.message };
  }
  throw error;
}

function upstreamError(logger: HttpLogger, context: string, error: unknown): JsonHttpResponse {
  logger.error(`failed to fetch ${context}`, { error: error instanceof Error ? error.message : String(error) });
  return {
    status: 502,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    body: 'Failed to fetch data from the federation. Please try again shortly.',
  };
}

function nonEmptyOrDefault(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed !== undefined && trimmed !== '' ? trimmed : fallback;
}
