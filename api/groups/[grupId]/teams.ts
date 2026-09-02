import type { IncomingMessage, ServerResponse } from 'node:http';
import { FcfCompetitionCatalogProvider } from '../../../src/federation/fcf/fcf-competition-catalog.provider.js';
import { handleTeamsRequest } from '../../../src/http/catalog-http-handler.js';

/** Vercel Node.js Serverless Function for `GET /api/groups/{grupId}/teams`. */
const catalog = new FcfCompetitionCatalogProvider();

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const response = await handleTeamsRequest(catalog, { method: req.method, url: req.url ?? '' });
  res.writeHead(response.status, response.headers);
  res.end(response.body);
}
