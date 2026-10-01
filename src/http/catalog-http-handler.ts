import type { CompetitionCatalogProvider } from '../federation/competition-catalog-provider.js';
import type { FederationProvider } from '../federation/federation-provider.js';
import type { TeamOption } from '../domain/competition-catalog.js';
import { DEFAULT_DISCIPLINA_ID, DEFAULT_TEMPORADA_ID } from '../federation/fcf/fcf-catalog-config.js';
import {
  InvalidRouteError,
  parseCompetitionsQuery,
  parseGroupsRoute,
  parseTeamsRoute,
} from './catalog-route.js';
import { consoleHttpLogger, type HttpLogger } from './http-logger.js';

const ALLOWED_METHODS = ['GET', 'HEAD'];

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

export async function handleTeamsRequest(
  catalog: CompetitionCatalogProvider,
  request: JsonHttpRequest,
  logger: HttpLogger = consoleHttpLogger,
  federation?: FederationProvider,
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
    const teams = await catalog.listTeams(grupId);
    const teamsWithCrests = federation ? await enrichTeamsWithCrests(teams, federation, grupId, logger) : teams;
    return jsonOk(teamsWithCrests);
  } catch (error) {
    return upstreamError(logger, `equipos (grupId="${grupId}")`, error);
  }
}

async function enrichTeamsWithCrests(
  teams: readonly TeamOption[],
  federation: FederationProvider,
  grupId: string,
  logger: HttpLogger,
): Promise<TeamOption[]> {
  let matches;
  try {
    matches = await federation.getMatches(grupId);
  } catch (error) {
    logger.error('failed to fetch matches for crest enrichment; returning teams without crests', {
      grupId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [...teams];
  }

  const crestByTeamId = new Map<string, string>();
  for (const match of matches) {
    if (match.homeTeam.crest) {
      crestByTeamId.set(match.homeTeam.id, match.homeTeam.crest);
    }
    if (match.awayTeam.crest) {
      crestByTeamId.set(match.awayTeam.id, match.awayTeam.crest);
    }
  }

  return teams.map((team) => {
    const crest = crestByTeamId.get(team.id);
    return crest !== undefined ? { ...team, crest } : team;
  });
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
  logger.error(`failed to fetch ${context}`, { error: describeErrorChain(error) });
  return {
    status: 502,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    body: 'Failed to fetch data from the federation. Please try again shortly.',
  };
}

// `error.message` alone hides the real cause here: FcfCatalogProviderError and FcfHttpError
// both wrap the underlying failure in `.cause` (an HTTP status + body snippet, a timeout, a
// network-level fetch failure, ...) rather than folding it into their own message, so a plain
// `error.message` log line only ever says "Failed to fetch FCF disciplines" — never *why*.
// Walks the `.cause` chain and joins each layer's message so the actual reason (a specific
// HTTP status from the FCF, a DNS/connect failure, a timeout) shows up in the server log.
function describeErrorChain(error: unknown): string {
  const messages: string[] = [];
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (current !== undefined && current !== null && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error) {
      messages.push(current.message);
      current = (current as { cause?: unknown }).cause;
    } else {
      messages.push(String(current));
      break;
    }
  }
  return messages.length > 0 ? messages.join(' <- caused by: ') : String(error);
}

function nonEmptyOrDefault(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed !== undefined && trimmed !== '' ? trimmed : fallback;
}
