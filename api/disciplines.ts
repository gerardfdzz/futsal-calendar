import type { IncomingMessage, ServerResponse } from 'node:http';
import { FcfCompetitionCatalogProvider } from '../src/federation/fcf/fcf-competition-catalog.provider.js';
import { handleDisciplinesRequest } from '../src/http/catalog-http-handler.js';

/**
 * Vercel Node.js Serverless Function for `GET /api/disciplines`.
 * Same thin-adapter shape as `api/calendar/[groupId]/[teamId].ts` — see
 * that file's doc comment for why this is deliberately plain
 * `IncomingMessage`/`ServerResponse` rather than `@vercel/node` types.
 */
const catalog = new FcfCompetitionCatalogProvider();

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const response = await handleDisciplinesRequest(catalog, { method: req.method, url: req.url ?? '' });
  res.writeHead(response.status, response.headers);
  res.end(response.body);
}
