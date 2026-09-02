import type { FederationProvider } from '../federation/federation-provider.js';
import type { Match } from '../domain/match.js';
import { getTeamMatches } from '../matches/team-matches.service.js';
import { generateIcs } from './ics-generator.js';
import type { GenerateIcsOptions } from './ics-config.js';
import { computeMatchesContentHash } from './match-content-hash.js';

export interface BuildTeamCalendarParams {
  readonly groupId: string;
  readonly teamId: string;

  /** Overrides the resolved `X-WR-CALNAME`. Normally left unset — see
   *  `resolveCalendarName` for how it's derived from the matches
   *  themselves when omitted. */
  readonly calendarName?: string;

  /** Passed through to `generateIcs` verbatim (duration, prodId,
   *  uidDomain, injectable `now`). `calendarName` lives on this params
   *  object instead, since it may need to be *resolved* here rather than
   *  supplied by the caller. */
  readonly icsOptions?: Omit<GenerateIcsOptions, 'calendarName'>;
}

export interface TeamCalendarResult {
  readonly ics: string;
  /** RFC 7232-quoted content hash, stable across requests as long as no
   *  match's relevant data actually changed — see
   *  `match-content-hash.ts`. Safe to use directly as an HTTP `ETag`. */
  readonly etag: string;
  readonly matchCount: number;
  readonly calendarName: string;
}

/**
 * Orchestrates the full pipeline the brief describes:
 *
 *   FederationProvider.getMatches(groupId)
 *     -> filterTeamMatches(teamId)      (byes are already excluded by the provider)
 *     -> generateIcs(...)
 *
 * This is the one function the upcoming Vercel handler (Milestone 3)
 * calls; it has no knowledge of HTTP, Vercel, or Node's `http` module, so
 * it stays trivially testable with a fake `FederationProvider` and is
 * reusable from a future Angular-adjacent script, a cron job, etc.
 *
 * Deliberately does NOT throw or special-case an empty result: a team
 * with zero matches for this group (wrong `teamId`, or a genuinely
 * fixture-less team) still produces a valid, empty `VCALENDAR`.
 * `matchCount` is returned precisely so the HTTP layer can decide for
 * itself whether "0 matches" should mean `200` with an empty calendar or
 * `404` — that's an HTTP-semantics decision, not this function's job.
 */
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

/**
 * The FCF never sends us a standalone "team name" endpoint — the only
 * place a team's display name appears is inside its own matches
 * (`NOMBRE_CASA`/`NOMBRE_FUERA`). So the first match's own team name is
 * the only honest source for `X-WR-CALNAME` we have.
 *
 * When there are no matches at all, we can't know the team's real name,
 * so we fall back to a plain, honest placeholder built from the id
 * rather than guessing or leaving the calendar unnamed.
 */
function resolveCalendarName(matches: readonly Match[], teamId: string): string {
  const firstMatch = matches[0];
  if (!firstMatch) {
    return `FCF ${teamId}`;
  }
  return firstMatch.homeTeam.id === teamId ? firstMatch.homeTeam.name : firstMatch.awayTeam.name;
}
