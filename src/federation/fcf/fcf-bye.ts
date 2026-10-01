import { FCF_BYE_TEAM_CODE, FCF_BYE_TEAM_NAME, type FcfMatchDto, type FcfMatchesResponse } from './fcf.types.js';

export function isBye(dto: FcfMatchDto): boolean {
  return isByeSide(dto.CODEQUIPO_CASA, dto.NOMBRE_CASA) || isByeSide(dto.CODEQUIPO_FUERA, dto.NOMBRE_FUERA);
}

export function findWithdrawnTeamIds(response: FcfMatchesResponse): ReadonlySet<string> {
  const withdrawn = new Set<string>();
  for (const dtos of Object.values(response)) {
    for (const dto of dtos) {
      collectWithdrawnTeamId(dto.CODEQUIPO_CASA, dto.NOMBRE_CASA, withdrawn);
      collectWithdrawnTeamId(dto.CODEQUIPO_FUERA, dto.NOMBRE_FUERA, withdrawn);
    }
  }
  return withdrawn;
}

function isByeSide(teamCode: string, teamName: string): boolean {
  if (teamCode.trim() === FCF_BYE_TEAM_CODE) {
    return true;
  }
  return teamName.trim().toLowerCase() === FCF_BYE_TEAM_NAME.toLowerCase();
}

function collectWithdrawnTeamId(teamCode: string, teamName: string, withdrawn: Set<string>): void {
  const trimmedCode = teamCode.trim();
  if (trimmedCode === '' || trimmedCode === FCF_BYE_TEAM_CODE) {
    return;
  }
  if (teamName.trim().toLowerCase() === FCF_BYE_TEAM_NAME.toLowerCase()) {
    withdrawn.add(trimmedCode);
  }
}
