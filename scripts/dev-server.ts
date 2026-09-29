import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { FcfFederationProvider } from '../src/federation/fcf/fcf.provider.js';
import { FcfCompetitionCatalogProvider } from '../src/federation/fcf/fcf-competition-catalog.provider.js';
import { handleCalendarRequest } from '../src/http/calendar-http-handler.js';
import { handleTeamMatchesRequest } from '../src/http/matches-http-handler.js';
import { handleTeamPageRequest } from '../src/http/team-page-http-handler.js';
import { handleSitemapRequest } from '../src/http/sitemap-http-handler.js';
import {
  handleCompetitionsRequest,
  handleDisciplinesRequest,
  handleGroupsRequest,
  handleTeamsRequest,
} from '../src/http/catalog-http-handler.js';
import { handleGroupContextRequest } from '../src/http/group-context-http-handler.js';

const port = Number(process.argv[2] ?? process.env['PORT'] ?? 3000);
const matchProvider = new FcfFederationProvider();
const catalog = new FcfCompetitionCatalogProvider();

const server = createServer((req, res) => {
  route(req)(req, res).catch((error) => {
    console.error('[dev-server] unhandled error', error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  });
});

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

function route(req: IncomingMessage): Handler {
  const pathname = safePathname(req.url ?? '');
  const segments = pathname.split('/').filter((segment) => segment.length > 0);

  if (segments[0] === 'api') {
    if (segments[1] === 'calendar') return serveCalendar;
    if (segments[1] === 'matches') return serveMatches;
    if (segments[1] === 'disciplines') return serveDisciplines;
    if (segments[1] === 'groups' && segments[3] === 'teams') return serveTeams;
    if (segments[1] === 'groups' && segments[3] === 'context') return serveGroupContext;
    if (segments[1] === 'competitions' && segments[3] === 'groups') return serveGroups;
    if (segments[1] === 'competitions') return serveCompetitions;
    if (segments[1] === 'team-page') return serveTeamPage;
    if (segments[1] === 'sitemap') return serveSitemap;
  }
  return serveNotFound;
}

const serveCalendar: Handler = async (req, res) => {
  const response = await handleCalendarRequest(matchProvider, {
    method: req.method,
    url: req.url ?? '',
    ifNoneMatch: firstHeaderValue(req.headers['if-none-match']),
  });
  res.writeHead(response.status, response.headers);
  res.end(response.body);
};

const serveMatches: Handler = async (req, res) => {
  const response = await handleTeamMatchesRequest(matchProvider, {
    method: req.method,
    url: req.url ?? '',
    ifNoneMatch: firstHeaderValue(req.headers['if-none-match']),
  });
  res.writeHead(response.status, response.headers);
  res.end(response.body);
};

const serveDisciplines: Handler = async (req, res) => {
  const response = await handleDisciplinesRequest(catalog, { method: req.method, url: req.url ?? '' });
  res.writeHead(response.status, response.headers);
  res.end(response.body);
};

const serveCompetitions: Handler = async (req, res) => {
  const response = await handleCompetitionsRequest(catalog, { method: req.method, url: req.url ?? '' });
  res.writeHead(response.status, response.headers);
  res.end(response.body);
};

const serveGroups: Handler = async (req, res) => {
  const response = await handleGroupsRequest(catalog, { method: req.method, url: req.url ?? '' });
  res.writeHead(response.status, response.headers);
  res.end(response.body);
};

const serveTeams: Handler = async (req, res) => {
  const response = await handleTeamsRequest(
    catalog,
    { method: req.method, url: req.url ?? '' },
    undefined,
    matchProvider,
  );
  res.writeHead(response.status, response.headers);
  res.end(response.body);
};

const serveGroupContext: Handler = async (req, res) => {
  const response = await handleGroupContextRequest(catalog, { method: req.method, url: req.url ?? '' });
  res.writeHead(response.status, response.headers);
  res.end(response.body);
};

const serveTeamPage: Handler = async (req, res) => {
  const response = await handleTeamPageRequest(matchProvider, catalog, { method: req.method, url: req.url ?? '' });
  res.writeHead(response.status, response.headers);
  res.end(response.body);
};

const serveSitemap: Handler = async (req, res) => {
  const response = await handleSitemapRequest(catalog, { method: req.method, url: req.url ?? '' });
  res.writeHead(response.status, response.headers);
  res.end(response.body);
};

const serveNotFound: Handler = async (_req, res) => {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
};

server.listen(port, () => {
  console.log(`Dev server listening on http://localhost:${port}`);
  console.log(`Try: http://localhost:${port}/api/calendar/58162580/54755993.ics`);
  console.log(`Try: http://localhost:${port}/api/matches/58162580/54755993`);
  console.log(`Try: http://localhost:${port}/api/disciplines`);
  console.log(`Try: http://localhost:${port}/api/groups/58162580/context`);
  console.log(`Try: http://localhost:${port}/api/team-page?groupId=58162580&teamId=54755993`);
  console.log(`Try: http://localhost:${port}/api/sitemap (slow on first hit — crawls the FCF catalog)`);
});

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function safePathname(rawUrl: string): string {
  try {
    return new URL(rawUrl, 'http://localhost').pathname;
  } catch {
    return '';
  }
}
