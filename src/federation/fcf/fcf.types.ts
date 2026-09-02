export interface FcfMatchDto {
  readonly CODGRUPO: string;
  readonly JORNADA: string;
  readonly CODACTA: string;

  readonly CODEQUIPO_CASA: string;
  readonly NOMBRE_CASA: string;
  readonly ESCUDO_CASA: string | null;

  readonly CODEQUIPO_FUERA: string;
  readonly NOMBRE_FUERA: string;
  readonly ESCUDO_FUERA: string | null;

  readonly CAMPO: string;

  readonly GOLES_CASA: string;
  readonly GOLES_FUERA: string;

  readonly COMIENZO1: string;

  readonly CERRADA: string;
  readonly ESTADO: string;
  readonly GRUPO: string;

  readonly LATITUD: string;
  readonly LONGITUD: string;

  readonly CODIGO_CAMPO: string | null;

  readonly CODCLUB_CASA: string | null;
  readonly CODCLUB_FUERA: string | null;
}

export type FcfMatchesResponse = Record<string, FcfMatchDto[]>;

export const FCF_BYE_TEAM_CODE = '-1';

export const FCF_BYE_TEAM_NAME = 'Descans';
