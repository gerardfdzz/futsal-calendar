import type { FcfMatchDto } from '../../src/federation/fcf/fcf.types.js';

/**
 * Base fixture modeled on the real data documented in the project brief:
 * group 58162580 ("TGN Gr. 14"), CFS LA SÉNIA (54755993) vs a plausible
 * opponent, CODACTA 4151650, kickoff 2026-09-26 18:30:00 Europe/Madrid.
 */
export function buildFcfMatchDto(overrides: Partial<FcfMatchDto> = {}): FcfMatchDto {
  return {
    CODGRUPO: '58162580',
    JORNADA: '3',
    CODACTA: '4151650',
    CODEQUIPO_CASA: '54755993',
    NOMBRE_CASA: 'CFS LA SÉNIA',
    ESCUDO_CASA: 'https://www.fcf.cat/escuts/54755993.png',
    CODEQUIPO_FUERA: '12345678',
    NOMBRE_FUERA: "L'AMETLLA",
    ESCUDO_FUERA: 'https://www.fcf.cat/escuts/12345678.png',
    CAMPO: 'Pavelló Municipal La Sénia',
    GOLES_CASA: '',
    GOLES_FUERA: '',
    COMIENZO1: '2026-09-26 18:30:00',
    CERRADA: '0',
    ESTADO: '0',
    GRUPO: '58162580',
    LATITUD: '40.6335',
    LONGITUD: '0.2536',
    CODIGO_CAMPO: '9001',
    CODCLUB_CASA: '7001',
    CODCLUB_FUERA: '7002',
    ...overrides,
  };
}

export function buildByeMatchDto(overrides: Partial<FcfMatchDto> = {}): FcfMatchDto {
  return buildFcfMatchDto({
    CODEQUIPO_FUERA: '-1',
    NOMBRE_FUERA: 'Descans',
    ESCUDO_FUERA: null,
    CODCLUB_FUERA: null,
    ...overrides,
  });
}
