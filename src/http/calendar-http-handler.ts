import type { FederationProvider } from '../federation/federation-provider.js';
import { consoleHttpLogger, type HttpLogger } from './http-logger.js';
import { SERVICE_DISCONTINUED_HEADERS, SERVICE_DISCONTINUED_MESSAGE } from './service-status.js';

const ALLOWED_METHODS = ['GET', 'HEAD'];

export interface CalendarHttpRequest {
  readonly method: string | undefined;
  readonly url: string;
  readonly ifNoneMatch?: string | undefined;
}

export interface CalendarHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export async function handleCalendarRequest(
  _provider: FederationProvider,
  request: CalendarHttpRequest,
  _logger: HttpLogger = consoleHttpLogger,
): Promise<CalendarHttpResponse> {
  if (request.method === undefined || !ALLOWED_METHODS.includes(request.method.toUpperCase())) {
    return {
      status: 405,
      headers: { Allow: ALLOWED_METHODS.join(', '), 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Method Not Allowed',
    };
  }

  return { status: 410, headers: SERVICE_DISCONTINUED_HEADERS, body: SERVICE_DISCONTINUED_MESSAGE };
}
