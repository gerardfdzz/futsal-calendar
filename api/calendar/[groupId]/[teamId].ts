import type { IncomingMessage, ServerResponse } from 'node:http';
import { FcfFederationProvider } from '../../../src/federation/fcf/fcf.provider.js';
import { handleCalendarRequest } from '../../../src/http/calendar-http-handler.js';

/**
 * Vercel Node.js Serverless Function for
 * `GET /api/calendar/{groupId}/{teamId}.ics`.
 *
 * Deliberately typed against plain Node `IncomingMessage`/`ServerResponse`
 * instead of `@vercel/node`'s types: Vercel's Node runtime is built
 * directly on Node's `http` module, so a plain `(req, res)` handler is
 * fully supported and avoids a dependency that can only be checked once
 * deployed.
 *
 * This file is intentionally thin: all real logic (routing, caching,
 * error mapping) lives in `handleCalendarRequest`, which knows nothing
 * about Vercel or Node's `http` module, so the local dev server can reuse
 * it and tests can exercise it without spinning up a server.
 */
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
