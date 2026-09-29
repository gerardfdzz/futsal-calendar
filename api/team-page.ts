import type { IncomingMessage, ServerResponse } from 'node:http';
import { FcfFederationProvider } from '../src/federation/fcf/fcf.provider.js';
import { FcfCompetitionCatalogProvider } from '../src/federation/fcf/fcf-competition-catalog.provider.js';
import { handleTeamPageRequest } from '../src/http/team-page-http-handler.js';

const federation = new FcfFederationProvider();
const catalog = new FcfCompetitionCatalogProvider();

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const response = await handleTeamPageRequest(federation, catalog, {
    method: req.method,
    url: req.url ?? '',
  });
  res.writeHead(response.status, response.headers);
  res.end(response.body);
}
