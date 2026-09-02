import { FCF_BYE_TEAM_CODE, FCF_BYE_TEAM_NAME, type FcfMatchDto } from './fcf.types.js';

/**
 * Detects a "Descans" (bye) pseudo-fixture: an odd number of teams in a
 * group means one team has no opponent on a given jornada, and the FCF
 * represents that as a fake "match" against a team coded `"-1"` named
 * `"Descans"`.
 *
 * We check the team *code* first (the documented, structural signal) and
 * fall back to the team *name* as a safety net in case a future response
 * ever has the code populated differently but keeps the "Descans" label —
 * matching on name alone would be fragile (accented/cased variants), so it
 * is intentionally the secondary check, not the primary one.
 *
 * Checked on both sides because we don't know for certain which side the
 * FCF places the placeholder on, and assuming "always CODEQUIPO_FUERA"
 * would be exactly the kind of unverified assumption we've been told not
 * to make.
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
