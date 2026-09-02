import type { IncomingMessage, ServerResponse } from 'node:http';
import { FcfFederationProvider } from '../../../src/federation/fcf/fcf.provider.js';
import { handleTeamMatchesRequest } from '../../../src/http/matches-http-handler.js';

/** Vercel Node.js Serverless Function for
 *  `GET /api/matches/{groupId}/{teamId}` — JSON match list, no ICS. */
const provider = new FcfFederationProvider();

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const response = await handleTeamMatchesRequest(provider, {
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
