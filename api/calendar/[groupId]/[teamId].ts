import type { IncomingMessage, ServerResponse } from 'node:http';
import { FcfFederationProvider } from '../../../src/federation/fcf/fcf.provider.js';
import { handleCalendarRequest } from '../../../src/http/calendar-http-handler.js';

const provider = new FcfFederationProvider();

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const response = await handleCalendarRequest(provider, {
    method: req.method,
    url: req.url ?? '',
    ifNoneMatch: firstHeaderValue(req.headers['if-none-match']),
  });

  res.writeHead(response.status, response.headers);
  res.end(response.body);
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
