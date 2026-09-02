import type { Competition, Discipline, Group, TeamOption } from '../../domain/competition-catalog.js';
import type { CompetitionCatalogProvider } from '../competition-catalog-provider.js';
import type { FcfCatalogOptionDto } from './fcf-catalog.types.js';
import { dedupeAndSortById, mapCatalogOption } from './fcf-catalog.mapper.js';
import { FcfHttpClient, type FcfHttpClientOptions } from './fcf-http-client.js';

export class FcfCatalogProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'FcfCatalogProviderError';
  }
}

const DEFAULT_BASE_URL = 'https://www.fcf.cat/api/competition';

export interface FcfCompetitionCatalogProviderOptions extends FcfHttpClientOptions {
  readonly baseUrl?: string;
}

/**
 * `CompetitionCatalogProvider` backed by the FCF `competition/*` family
 * of endpoints the site's own selector uses
 * (`disciplines`/`competicions`/`grupos`/`equipos`).
 *
 * Like `FcfFederationProvider`, this is the ONLY place in the codebase
 * allowed to know these endpoint paths or the raw `{value, label}` shape
 * they return.
 */
export class FcfCompetitionCatalogProvider implements CompetitionCatalogProvider {
  private readonly http: FcfHttpClient;
  private readonly baseUrl: string;

  constructor(options: FcfCompetitionCatalogProviderOptions = {}) {
    this.http = new FcfHttpClient(options);
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  async listDisciplines(): Promise<Discipline[]> {
    const dtos = await this.fetchOptions(`${this.baseUrl}/disciplines`, 'disciplines');
    return dtos.map(mapCatalogOption);
  }

  async listCompetitions(disciplinaId: string, temporada: string): Promise<Competition[]> {
    const id = requireNonEmpty(disciplinaId, 'disciplinaId');
    const season = requireNonEmpty(temporada, 'temporada');
    const url = `${this.baseUrl}/competicions?disciplinaId=${encodeURIComponent(id)}&temporada=${encodeURIComponent(season)}`;
    const dtos = await this.fetchOptions(url, `competicions (disciplinaId="${id}", temporada="${season}")`);
    return dtos.map(mapCatalogOption);
  }

  async listGroups(competicioId: string): Promise<Group[]> {
    const id = requireNonEmpty(competicioId, 'competicioId');
    const url = `${this.baseUrl}/grupos?competicioId=${encodeURIComponent(id)}`;
    const dtos = await this.fetchOptions(url, `grupos (competicioId="${id}")`);
    return dtos.map(mapCatalogOption);
  }

  async listTeams(grupId: string): Promise<TeamOption[]> {
    const id = requireNonEmpty(grupId, 'grupId');
    const url = `${this.baseUrl}/equipos?grupId=${encodeURIComponent(id)}`;
    const dtos = await this.fetchOptions(url, `equipos (grupId="${id}")`);
    return dedupeAndSortById(dtos.map(mapCatalogOption));
  }

  private async fetchOptions(url: string, context: string): Promise<FcfCatalogOptionDto[]> {
    let body: unknown;
    try {
      body = await this.http.getJson(url, context);
    } catch (error) {
      throw new FcfCatalogProviderError(`Failed to fetch FCF ${context}`, { cause: error });
    }

    if (!isArrayOfCatalogOptions(body)) {
      throw new FcfCatalogProviderError(
        `FCF endpoint returned an unexpected shape for ${context} (expected an array of {value, label})`,
      );
    }
    return body;
  }
}

function requireNonEmpty(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new FcfCatalogProviderError(`${fieldName} must be a non-empty string`);
  }
  return trimmed;
}

function isArrayOfCatalogOptions(value: unknown): value is FcfCatalogOptionDto[] {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every(
    (entry): entry is FcfCatalogOptionDto =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as Record<string, unknown>)['value'] === 'string' &&
      typeof (entry as Record<string, unknown>)['label'] === 'string',
  );
}
