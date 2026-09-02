import type { Match } from '../domain/match.js';

/**
 * Keeps only the matches where `teamId` plays, either as home or away.
 *
 * `teamId` must be an FCF team code (`CODEQUIPO_*`), never a team name —
 * see `TeamRef.id`'s doc comment for why name-based filtering is unsafe in
 * this federation (two distinct "La Sénia" teams share the same group).
 */
export function filterTeamMatches(matches: readonly Match[], teamId: string): Match[] {
  const trimmedTeamId = teamId.trim();
  return matches.filter((match) => match.homeTeam.id === trimmedTeamId || match.awayTeam.id === trimmedTeamId);
}
