import type { CompetitionCatalogProvider } from '../federation/competition-catalog-provider.js';
import type { FederationProvider } from '../federation/federation-provider.js';
import { consoleHttpLogger, type HttpLogger } from './http-logger.js';

const ALLOWED_METHODS = ['GET', 'HEAD'];

export interface HealthHttpRequest {
  readonly method: string | undefined;
  readonly url: string;
}

export interface HealthHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export async function handleHealthRequest(
  _catalog: CompetitionCatalogProvider,
  _federation: FederationProvider,
  request: HealthHttpRequest,
  _logger: HttpLogger = consoleHttpLogger,
): Promise<HealthHttpResponse> {
  const method = request.method?.toUpperCase();

  if (method === undefined || !ALLOWED_METHODS.includes(method)) {
    return {
      status: 405,
      headers: { Allow: ALLOWED_METHODS.join(', '), 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Method Not Allowed',
    };
  }

  return {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body:
      method === 'HEAD'
        ? ''
        : JSON.stringify({ status: 'discontinued', checkedAt: new Date().toISOString(), checks: {} }),
  };
}
