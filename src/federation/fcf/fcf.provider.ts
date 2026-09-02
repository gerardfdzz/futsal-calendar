import type { Match } from '../../domain/match.js';
import type { FederationProvider } from '../federation-provider.js';
import type { FcfMatchDto, FcfMatchesResponse } from './fcf.types.js';
import { isBye } from './fcf-bye.js';
import { FcfMappingError, mapFcfMatch } from './fcf.mapper.js';
import { consoleFcfLogger, type FcfLogger } from './fcf-logger.js';

export class FcfProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'FcfProviderError';
  }
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface FcfFederationProviderOptions {
  readonly fetchFn?: FetchLike;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly retryDelayMs?: number;
  readonly userAgent?: string;
  readonly logger?: FcfLogger;
}

const DEFAULT_BASE_URL = 'https://www.fcf.cat/api/competition/partidos';
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 300;

function buildDefaultUserAgent(): string {
  const contact = process.env['FCF_USER_AGENT_CONTACT'];
  return contact ? `futsal-calendar-sync/0.1 (+contact: ${contact})` : 'futsal-calendar-sync/0.1';
}

export class FcfFederationProvider implements FederationProvider {
  private readonly fetchFn: FetchLike;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly userAgent: string;
  private readonly logger: FcfLogger;

  constructor(options: FcfFederationProviderOptions = {}) {
    this.fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.userAgent = options.userAgent ?? buildDefaultUserAgent();
    this.logger = options.logger ?? consoleFcfLogger;
  }

  async getMatches(groupId: string): Promise<Match[]> {
    const trimmedGroupId = groupId.trim();
    if (trimmedGroupId === '') {
      throw new FcfProviderError('groupId must be a non-empty string');
    }

    const response = await this.fetchMatchesResponse(trimmedGroupId);
    return this.flattenAndMap(response, trimmedGroupId);
  }

  private async fetchMatchesResponse(groupId: string): Promise<FcfMatchesResponse> {
    const url = `${this.baseUrl}?grupId=${encodeURIComponent(groupId)}`;

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.fetchOnce(url);

        if (!response.ok) {
          const bodySnippet = await safeReadSnippet(response);
          const httpError = new FcfProviderError(
            `FCF endpoint returned HTTP ${response.status} for groupId="${groupId}": ${bodySnippet}`,
          );

          if (response.status >= 500 && attempt < this.maxRetries) {
            lastError = httpError;
            this.logger.warn('FCF endpoint returned a server error, will retry', {
              groupId,
              status: response.status,
              attempt,
            });
            await sleep(this.backoffMs(attempt));
            continue;
          }
          throw httpError;
        }

        return await this.parseJson(response, groupId);
      } catch (error) {
        if (error instanceof FcfProviderError) {
          throw error;
        }

        lastError = error;
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        this.logger.warn(isTimeout ? 'FCF request timed out' : 'FCF request failed', {
          groupId,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });

        if (attempt >= this.maxRetries) {
          break;
        }
        await sleep(this.backoffMs(attempt));
      }
    }

    throw new FcfProviderError(
      `Failed to fetch FCF matches for groupId="${groupId}" after ${this.maxRetries + 1} attempt(s)`,
      { cause: lastError },
    );
  }

  private async fetchOnce(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchFn(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': this.userAgent,
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async parseJson(response: Response, groupId: string): Promise<FcfMatchesResponse> {
    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      throw new FcfProviderError(`FCF endpoint returned invalid JSON for groupId="${groupId}"`, { cause: error });
    }

    if (!isPlainRecordOfArrays(body)) {
      throw new FcfProviderError(
        `FCF endpoint returned an unexpected shape for groupId="${groupId}" (expected an object mapping jornada -> match[])`,
      );
    }

    return body;
  }

  private flattenAndMap(response: FcfMatchesResponse, groupId: string): Match[] {
    const matches: Match[] = [];

    for (const [jornadaKey, dtos] of Object.entries(response)) {
      const round = Number(jornadaKey);
      if (!Number.isFinite(round)) {
        this.logger.warn('Skipping jornada group with a non-numeric key', { groupId, jornadaKey });
        continue;
      }

      for (const dto of dtos) {
        if (isBye(dto)) {
          continue;
        }

        try {
          matches.push(mapFcfMatch(dto, round, this.logger));
        } catch (error) {
          if (error instanceof FcfMappingError) {
            this.logger.error('Skipping one match that failed to map', {
              groupId,
              codacta: dto.CODACTA,
              error: error.message,
            });
            continue;
          }
          throw error;
        }
      }
    }

    matches.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    return matches;
  }

  private backoffMs(attempt: number): number {
    const exponential = this.retryDelayMs * 2 ** attempt;
    const jitter = Math.random() * 100;
    return exponential + jitter;
  }
}

function isPlainRecordOfArrays(value: unknown): value is FcfMatchesResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value as Record<string, unknown>).every((entry): entry is FcfMatchDto[] => Array.isArray(entry));
}

async function safeReadSnippet(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 200);
  } catch {
    return '(could not read response body)';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
