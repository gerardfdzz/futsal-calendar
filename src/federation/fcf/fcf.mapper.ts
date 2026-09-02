import type { Match } from '../../domain/match.js';
import type { TeamRef } from '../../domain/team.js';
import type { Venue } from '../../domain/venue.js';
import type { FcfMatchDto } from './fcf.types.js';
import { parseFcfDate } from './fcf-date.js';
import { mapFcfStatus } from './fcf-status.mapper.js';
import { noopFcfLogger, type FcfLogger } from './fcf-logger.js';

export class FcfMappingError extends Error {
  constructor(codacta: string, reason: string, options?: { cause?: unknown }) {
    super(`Cannot map FCF match CODACTA="${codacta}": ${reason}`, options);
    this.name = 'FcfMappingError';
  }
}

export function mapFcfMatch(dto: FcfMatchDto, round: number, logger: FcfLogger = noopFcfLogger): Match {
  if (dto.JORNADA.trim() !== '' && Number(dto.JORNADA) !== round) {
    logger.warn('dto.JORNADA does not match the jornada group key it was found under; trusting the group key', {
      codacta: dto.CODACTA,
      dtoJornada: dto.JORNADA,
      groupKeyRound: round,
    });
  }

  let startsAt: Date;
  try {
    startsAt = parseFcfDate(dto.COMIENZO1);
  } catch (error) {
    throw new FcfMappingError(dto.CODACTA, `invalid COMIENZO1 "${dto.COMIENZO1}"`, { cause: error });
  }

  const homeTeam = mapTeam(dto.CODEQUIPO_CASA, dto.NOMBRE_CASA, dto.CODCLUB_CASA, dto.ESCUDO_CASA);
  const awayTeam = mapTeam(dto.CODEQUIPO_FUERA, dto.NOMBRE_FUERA, dto.CODCLUB_FUERA, dto.ESCUDO_FUERA);
  const venue = mapVenue(dto.CAMPO, dto.CODIGO_CAMPO, dto.LATITUD, dto.LONGITUD);
  const status = mapFcfStatus(dto, logger);

  return {
    id: dto.CODACTA.trim(),
    round,
    homeTeam,
    awayTeam,
    startsAt,
    ...(venue ? { venue } : {}),
    groupId: dto.CODGRUPO.trim(),
    status,
  };
}

function mapTeam(
  code: string,
  rawName: string,
  clubId: string | null,
  crest: string | null,
): TeamRef {
  const normalizedClubId = normalizeOptionalString(clubId);
  const normalizedCrest = normalizeOptionalString(crest);

  return {
    id: code.trim(),
    name: rawName.trim(),
    ...(normalizedClubId !== undefined ? { clubId: normalizedClubId } : {}),
    ...(normalizedCrest !== undefined ? { crest: normalizedCrest } : {}),
  };
}

function mapVenue(
  rawName: string,
  venueCode: string | null,
  rawLatitude: string,
  rawLongitude: string,
): Venue | undefined {
  const name = rawName.trim();
  if (name === '') {
    return undefined;
  }

  const id = normalizeOptionalString(venueCode);
  const latitude = parseOptionalFloat(rawLatitude);
  const longitude = parseOptionalFloat(rawLongitude);

  return {
    name,
    ...(id !== undefined ? { id } : {}),
    ...(latitude !== undefined ? { latitude } : {}),
    ...(longitude !== undefined ? { longitude } : {}),
  };
}

function normalizeOptionalString(raw: string | null | undefined): string | undefined {
  if (raw === null || raw === undefined) {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

function parseOptionalFloat(raw: string | null | undefined): number | undefined {
  const normalized = normalizeOptionalString(raw);
  if (normalized === undefined) {
    return undefined;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}
