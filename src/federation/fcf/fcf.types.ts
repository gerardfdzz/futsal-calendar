/**
 * Raw shape returned by `GET https://www.fcf.cat/api/competition/partidos?grupId={groupId}`.
 *
 * Every field is typed exactly as the FCF sends it: strings, including for
 * things that are "really" numbers or booleans, and nullable where we have
 * observed `null` in practice. Do NOT tighten these types based on
 * assumptions — if a field turns out to always be non-null, confirm it
 * against real responses first. This interface is only ever consumed by
 * `fcf.mapper.ts` / `fcf-status.mapper.ts` / `fcf.provider.ts`; nothing
 * outside `federation/fcf/` should import it.
 */
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

  /** Local kickoff date-time in `Europe/Madrid`, formatted as
   *  `"YYYY-MM-DD HH:mm:ss"`. Never UTC — see `fcf-date.ts`. */
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

/**
 * The endpoint groups matches by jornada (matchday) number, encoded as the
 * object's own keys (e.g. `"1"`, `"2"`, ...). The FCF also repeats the
 * jornada on each match as `JORNADA`, but we treat the object key as
 * authoritative — see the comment in `fcf.provider.ts` for why.
 */
export type FcfMatchesResponse = Record<string, FcfMatchDto[]>;

/** The literal FCF code used for a bye ("Descans") pseudo-team. */
export const FCF_BYE_TEAM_CODE = '-1';

/** The literal FCF display name used for a bye ("Descans") pseudo-team. */
export const FCF_BYE_TEAM_NAME = 'Descans';
