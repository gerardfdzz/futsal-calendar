import type { CompetitionCatalogProvider } from '../federation/competition-catalog-provider.js';
import type { FederationProvider } from '../federation/federation-provider.js';
import { consoleHttpLogger, type HttpLogger } from './http-logger.js';
import { SERVICE_DISCONTINUED_HEADERS, SERVICE_DISCONTINUED_MESSAGE } from './service-status.js';

const ALLOWED_METHODS = ['GET', 'HEAD'];

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
  _catalog: CompetitionCatalogProvider,
  request: JsonHttpRequest,
  _logger: HttpLogger = consoleHttpLogger,
): Promise<JsonHttpResponse> {
  const methodError = checkMethod(request.method);
  if (methodError) return methodError;
  return discontinued();
}

export async function handleCompetitionsRequest(
  _catalog: CompetitionCatalogProvider,
  request: JsonHttpRequest,
  _logger: HttpLogger = consoleHttpLogger,
): Promise<JsonHttpResponse> {
  const methodError = checkMethod(request.method);
  if (methodError) return methodError;
  return discontinued();
}

export async function handleGroupsRequest(
  _catalog: CompetitionCatalogProvider,
  request: JsonHttpRequest,
  _logger: HttpLogger = consoleHttpLogger,
): Promise<JsonHttpResponse> {
  const methodError = checkMethod(request.method);
  if (methodError) return methodError;
  return discontinued();
}

export async function handleTeamsRequest(
  _catalog: CompetitionCatalogProvider,
  request: JsonHttpRequest,
  _logger: HttpLogger = consoleHttpLogger,
  _federation?: FederationProvider,
): Promise<JsonHttpResponse> {
  const methodError = checkMethod(request.method);
  if (methodError) return methodError;
  return discontinued();
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

function discontinued(): JsonHttpResponse {
  return { status: 410, headers: SERVICE_DISCONTINUED_HEADERS, body: SERVICE_DISCONTINUED_MESSAGE };
}
