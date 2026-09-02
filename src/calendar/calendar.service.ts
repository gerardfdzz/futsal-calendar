import type { FederationProvider } from '../federation/federation-provider.js';
import type { Match } from '../domain/match.js';
import { getTeamMatches } from '../matches/team-matches.service.js';
import { generateIcs } from './ics-generator.js';
import type { GenerateIcsOptions } from './ics-config.js';
import { computeMatchesContentHash } from './match-content-hash.js';

export interface BuildTeamCalendarParams {
  readonly groupId: string;
  readonly teamId: string;

  readonly calendarName?: string;

  readonly icsOptions?: Omit<GenerateIcsOptions, 'calendarName'>;
}

export interface TeamCalendarResult {
  readonly ics: string;
  readonly etag: string;
  readonly matchCount: number;
  readonly calendarName: string;
}

export async function buildTeamCalendar(
  provider: FederationProvider,
  params: BuildTeamCalendarParams,
): Promise<TeamCalendarResult> {
  const groupId = params.groupId.trim();
  const teamId = params.teamId.trim();

  const teamMatches = await getTeamMatches(provider, groupId, teamId);

  const calendarName = params.calendarName ?? resolveCalendarName(teamMatches, teamId);

  const ics = generateIcs(teamMatches, { ...params.icsOptions, calendarName });
  const etag = computeMatchesContentHash(teamMatches, calendarName);

  return { ics, etag, matchCount: teamMatches.length, calendarName };
}

function resolveCalendarName(matches: readonly Match[], teamId: string): string {
  const firstMatch = matches[0];
  if (!firstMatch) {
    return `FCF ${teamId}`;
  }
  return firstMatch.homeTeam.id === teamId ? firstMatch.homeTeam.name : firstMatch.awayTeam.name;
}
