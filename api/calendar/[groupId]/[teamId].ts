import type { IncomingMessage, ServerResponse } from 'node:http';
import { FcfFederationProvider } from '../../../src/federation/fcf/fcf.provider.js';
import { handleCalendarRequest } from '../../../src/http/calendar-http-handler.js';

/**
 * Vercel Node.js Serverless Function for
 * `GET /api/calendar/{groupId}/{teamId}.ics`.
 *
 * Deliberately typed against plain Node `IncomingMessage`/`ServerResponse`
 * instead of `@vercel/node`'s `VercelRequest`/`VercelResponse`: Vercel's
 * Node runtime is built directly on top of Node's `http` module, so a
 * plain `(req, res)` handler is a fully supported, documented way to
 * write a Vercel function — we don't need `res.status()`/`res.json()`
 * sugar, and skipping the dependency means this file, and everything it
 * imports, can be verified with nothing but `tsc` + `node:test`, with no
 * package that can only be checked once actually deployed.
 *
 * This file is intentionally thin: all real logic (routing, caching,
 * error mapping) lives in `handleCalendarRequest`, which knows nothing
 * about Vercel or Node's `http` module. That's what lets
 * `scripts/dev-server.mjs` reuse the exact same logic locally, and what
 * lets `tests/http/calendar-http-handler.test.ts` test it without
 * spinning up a server at all.
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
