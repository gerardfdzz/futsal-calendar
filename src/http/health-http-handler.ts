import type { CompetitionCatalogProvider } from '../federation/competition-catalog-provider.js';
import type { FederationProvider } from '../federation/federation-provider.js';
import { consoleHttpLogger, type HttpLogger } from './http-logger.js';

const ALLOWED_METHODS = ['GET', 'HEAD'];
const HEALTH_CHECK_GROUP_ID = '58162580';

export interface HealthHttpRequest {
  readonly method: string | undefined;
  readonly url: string;
}

export interface HealthHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

interface HealthCheckResult {
  readonly ok: boolean;
  readonly count?: number;
  readonly error?: string;
}

export async function handleHealthRequest(
  catalog: CompetitionCatalogProvider,
  federation: FederationProvider,
  request: HealthHttpRequest,
  logger: HttpLogger = consoleHttpLogger,
): Promise<HealthHttpResponse> {
  const method = request.method?.toUpperCase();

  if (method === undefined || !ALLOWED_METHODS.includes(method)) {
    return {
      status: 405,
      headers: { Allow: ALLOWED_METHODS.join(', '), 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Method Not Allowed',
    };
  }

  const [disciplines, matches] = await Promise.all([
    runCheck(() => catalog.listDisciplines()),
    runCheck(() => federation.getMatches(HEALTH_CHECK_GROUP_ID)),
  ]);

  const checks = { disciplines, matches };
  const healthy = disciplines.ok && matches.ok;

  if (!healthy) {
    logger.error('health check failed', { checks });
  }

  return {
    status: healthy ? 200 : 503,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: method === 'HEAD' ? '' : JSON.stringify({ status: healthy ? 'ok' : 'down', checkedAt: new Date().toISOString(), checks }),
  };
}

async function runCheck<T extends readonly unknown[]>(fn: () => Promise<T>): Promise<HealthCheckResult> {
  try {
    const result = await fn();
    return { ok: true, count: result.length };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 300);
}
