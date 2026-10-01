import type { FederationProvider } from '../federation/federation-provider.js';
import type { CompetitionCatalogProvider } from '../federation/competition-catalog-provider.js';
import type { Match } from '../domain/match.js';
import { getTeamMatches } from '../matches/team-matches.service.js';
import { buildTeamPageHtml, buildTeamPageUrl } from '../seo/team-page-html.js';
import { escapeHtml } from '../seo/html-escape.js';
import { consoleHttpLogger, type HttpLogger } from './http-logger.js';

const ALLOWED_METHODS = ['GET', 'HEAD'];
const TEAM_PAGE_CACHE_MAX_AGE_SECONDS = 30 * 60;

export interface TeamPageHttpRequest {
  readonly method: string | undefined;
  readonly url: string;
}

export interface TeamPageHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export class InvalidTeamPageRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTeamPageRequestError';
  }
}

export async function handleTeamPageRequest(
  federation: FederationProvider,
  catalog: CompetitionCatalogProvider | undefined,
  request: TeamPageHttpRequest,
  logger: HttpLogger = consoleHttpLogger,
): Promise<TeamPageHttpResponse> {
  if (request.method === undefined || !ALLOWED_METHODS.includes(request.method.toUpperCase())) {
    return {
      status: 405,
      headers: { Allow: ALLOWED_METHODS.join(', '), 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Method Not Allowed',
    };
  }

  let groupId: string;
  let teamId: string;
  try {
    ({ groupId, teamId } = parseTeamPageQuery(request.url));
  } catch (error) {
    if (error instanceof InvalidTeamPageRequestError) {
      return { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: error.message };
    }
    throw error;
  }

  let matches: Match[];
  try {
    matches = await getTeamMatches(federation, groupId, teamId);
  } catch (error) {
    logger.error('failed to fetch team matches for the bot-facing team page', {
      groupId,
      teamId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      status: 502,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      body: buildFallbackHtml(groupId, teamId),
    };
  }

  const teamName = pickTeamName(matches, teamId) ?? (await lookupTeamNameFromCatalog(catalog, groupId, teamId, logger));

  if (teamName === undefined) {
    return {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      body: buildFallbackHtml(groupId, teamId),
    };
  }

  const html = buildTeamPageHtml({ teamName, groupId, teamId, matches });
  const isHead = request.method.toUpperCase() === 'HEAD';
  return {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': `public, max-age=${TEAM_PAGE_CACHE_MAX_AGE_SECONDS}`,
    },
    body: isHead ? '' : html,
  };
}

function pickTeamName(matches: readonly Match[], teamId: string): string | undefined {
  for (const match of matches) {
    if (match.homeTeam.id === teamId) return match.homeTeam.name;
    if (match.awayTeam.id === teamId) return match.awayTeam.name;
  }
  return undefined;
}

async function lookupTeamNameFromCatalog(
  catalog: CompetitionCatalogProvider | undefined,
  groupId: string,
  teamId: string,
  logger: HttpLogger,
): Promise<string | undefined> {
  if (!catalog) {
    return undefined;
  }
  try {
    const teams = await catalog.listTeams(groupId);
    return teams.find((team) => team.id === teamId)?.name;
  } catch (error) {
    logger.error('failed to fall back to the catalog for the team name on the bot-facing team page', {
      groupId,
      teamId,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

function parseTeamPageQuery(rawUrl: string): { groupId: string; teamId: string } {
  let url: URL;
  try {
    url = new URL(rawUrl, 'http://localhost');
  } catch {
    throw new InvalidTeamPageRequestError(`Could not parse request URL: "${rawUrl}"`);
  }

  const groupId = (url.searchParams.get('groupId') ?? '').trim();
  const teamId = (url.searchParams.get('teamId') ?? '').trim();

  if (groupId === '' || teamId === '') {
    throw new InvalidTeamPageRequestError(
      `Expected "groupId" and "teamId" query parameters, got: "${rawUrl}"`,
    );
  }

  return { groupId, teamId };
}

function buildFallbackHtml(groupId: string, teamId: string): string {
  const pageUrl = buildTeamPageUrl(groupId, teamId);
  return `<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8" />
<title>Partits al Calendari — Sincronitza el teu equip de la FCF</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
<p>No hem pogut carregar aquest equip ara mateix. <a href="${escapeHtml(pageUrl)}">Torna-ho a provar</a>.</p>
</body>
</html>
`;
}
