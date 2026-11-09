import type { FederationProvider } from '../federation/federation-provider.js';
import type { CompetitionCatalogProvider } from '../federation/competition-catalog-provider.js';
import { consoleHttpLogger, type HttpLogger } from './http-logger.js';
import { SERVICE_DISCONTINUED_HEADERS, SERVICE_DISCONTINUED_MESSAGE } from './service-status.js';

const ALLOWED_METHODS = ['GET', 'HEAD'];

export interface TeamPageHttpRequest {
  readonly method: string | undefined;
  readonly url: string;
}

export interface TeamPageHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export class InvalidTeamPageRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTeamPageRequestError';
  }
}

export async function handleTeamPageRequest(
  _federation: FederationProvider,
  _catalog: CompetitionCatalogProvider | undefined,
  request: TeamPageHttpRequest,
  _logger: HttpLogger = consoleHttpLogger,
): Promise<TeamPageHttpResponse> {
  if (request.method === undefined || !ALLOWED_METHODS.includes(request.method.toUpperCase())) {
    return {
      status: 405,
      headers: { Allow: ALLOWED_METHODS.join(', '), 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Method Not Allowed',
    };
  }

  return { status: 410, headers: SERVICE_DISCONTINUED_HEADERS, body: SERVICE_DISCONTINUED_MESSAGE };
}
