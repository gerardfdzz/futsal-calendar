import type { IncomingMessage, ServerResponse } from 'node:http';
import { FcfCompetitionCatalogProvider } from '../src/federation/fcf/fcf-competition-catalog.provider.js';
import { handleCompetitionsRequest } from '../src/http/catalog-http-handler.js';

const catalog = new FcfCompetitionCatalogProvider();

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const response = await handleCompetitionsRequest(catalog, { method: req.method, url: req.url ?? '' });
  res.writeHead(response.status, response.headers);
  res.end(response.body);
}
