import type { IncomingMessage, ServerResponse } from 'node:http';
import { FcfCompetitionCatalogProvider } from '../../../src/federation/fcf/fcf-competition-catalog.provider.js';
import { handleGroupsRequest } from '../../../src/http/catalog-http-handler.js';

/** Vercel Node.js Serverless Function for
 *  `GET /api/competitions/{competicioId}/groups`. */
const catalog = new FcfCompetitionCatalogProvider();

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const response = await handleGroupsRequest(catalog, { method: req.method, url: req.url ?? '' });
  res.writeHead(response.status, response.headers);
  res.end(response.body);
}
