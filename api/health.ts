import type { IncomingMessage, ServerResponse } from 'node:http';
import { FcfCompetitionCatalogProvider } from '../src/federation/fcf/fcf-competition-catalog.provider.js';
import { FcfFederationProvider } from '../src/federation/fcf/fcf.provider.js';
import { handleHealthRequest } from '../src/http/health-http-handler.js';

const HEALTH_CHECK_TIMEOUT_MS = 5_000;

const catalog = new FcfCompetitionCatalogProvider({ timeoutMs: HEALTH_CHECK_TIMEOUT_MS, maxRetries: 0 });
const federation = new FcfFederationProvider({ timeoutMs: HEALTH_CHECK_TIMEOUT_MS, maxRetries: 0 });

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const response = await handleHealthRequest(catalog, federation, { method: req.method, url: req.url ?? '' });
  res.writeHead(response.status, response.headers);
  res.end(response.body);
}
