import type { Match } from '../domain/match.js';

export function filterTeamMatches(matches: readonly Match[], teamId: string): Match[] {
  const trimmedTeamId = teamId.trim();
  return matches.filter((match) => match.homeTeam.id === trimmedTeamId || match.awayTeam.id === trimmedTeamId);
}
