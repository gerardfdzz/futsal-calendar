import { FCF_BYE_TEAM_CODE, FCF_BYE_TEAM_NAME, type FcfMatchDto } from './fcf.types.js';

export function isBye(dto: FcfMatchDto): boolean {
  return isByeSide(dto.CODEQUIPO_CASA, dto.NOMBRE_CASA) || isByeSide(dto.CODEQUIPO_FUERA, dto.NOMBRE_FUERA);
}

function isByeSide(teamCode: string, teamName: string): boolean {
  if (teamCode.trim() === FCF_BYE_TEAM_CODE) {
    return true;
  }
  return teamName.trim().toLowerCase() === FCF_BYE_TEAM_NAME.toLowerCase();
}
