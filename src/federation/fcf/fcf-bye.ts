import { FCF_BYE_TEAM_CODE, FCF_BYE_TEAM_NAME, type FcfMatchDto } from './fcf.types.js';

/**
 * Detects a "Descans" (bye) pseudo-fixture: an odd number of teams in a
 * group means one team has no opponent on a given jornada, and the FCF
 * represents that as a fake "match" against a team coded `"-1"` named
 * `"Descans"`.
 *
 * Checks the team code first, falling back to the name as a safety net.
 * Checked on both home and away sides since we don't know which side the
 * FCF places the placeholder on.
 */
export function isBye(dto: FcfMatchDto): boolean {
  return isByeSide(dto.CODEQUIPO_CASA, dto.NOMBRE_CASA) || isByeSide(dto.CODEQUIPO_FUERA, dto.NOMBRE_FUERA);
}

function isByeSide(teamCode: string, teamName: string): boolean {
  if (teamCode.trim() === FCF_BYE_TEAM_CODE) {
    return true;
  }
  return teamName.trim().toLowerCase() === FCF_BYE_TEAM_NAME.toLowerCase();
}
