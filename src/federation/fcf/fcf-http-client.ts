import { consoleFcfLogger, type FcfLogger } from './fcf-logger.js';

/**
 * Small shared "fetch JSON from the FCF, with timeout/retry" helper.
 *
 * `FcfFederationProvider` has its own copy of this same timeout/retry/
 * backoff logic and is deliberately NOT refactored onto this client:
 * it's an already-tested, production match-sync path, and touching it
 * purely for DRY carries regression risk for no user-facing benefit.
 */
export class FcfHttpError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'FcfHttpError';
  }
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface FcfHttpClientOptions {
  /** Injectable for tests; defaults to the global `fetch`. */
  readonly fetchFn?: FetchLike;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly retryDelayMs?: number;
  readonly userAgent?: string;
  readonly logger?: FcfLogger;
}

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 300;

function buildDefaultUserAgent(): string {
  const contact = process.env['FCF_USER_AGENT_CONTACT'];
  return contact ? `futsal-calendar-sync/0.1 (+contact: ${contact})` : 'futsal-calendar-sync/0.1';
}

export class FcfHttpClient {
  private readonly fetchFn: FetchLike;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly userAgent: string;
  private readonly logger: FcfLogger;

  constructor(options: FcfHttpClientOptions = {}) {
    this.fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.userAgent = options.userAgent ?? buildDefaultUserAgent();
    this.logger = options.logger ?? consoleFcfLogger;
  }

  /**
   * GETs `url` and returns the parsed JSON body. `context` is a short,
   * human-readable description of the call (e.g. `groupId="58162580"`)
   * used only in error messages/log lines.
   */
  async getJson(url: string, context: string): Promise<unknown> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.fetchOnce(url);

        if (!response.ok) {
          const bodySnippet = await safeReadSnippet(response);
          const httpError = new FcfHttpError(
            `FCF endpoint returned HTTP ${response.status} for ${context}: ${bodySnippet}`,
          );

          if (response.status >= 500 && attempt < this.maxRetries) {
            lastError = httpError;
            this.logger.warn('FCF endpoint returned a server error, will retry', { context, status: response.status, attempt });
            await sleep(this.backoffMs(attempt));
            continue;
          }
          throw httpError;
        }

        return await this.parseJson(response, context);
      } catch (error) {
        if (error instanceof FcfHttpError) {
          throw error;
        }

        lastError = error;
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        this.logger.warn(isTimeout ? 'FCF request timed out' : 'FCF request failed', {
          context,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });

        if (attempt >= this.maxRetries) {
          break;
        }
        await sleep(this.backoffMs(attempt));
      }
    }

    throw new FcfHttpError(`Failed to fetch FCF data for ${context} after ${this.maxRetries + 1} attempt(s)`, {
      cause: lastError,
    });
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

  private async parseJson(response: Response, context: string): Promise<unknown> {
    try {
      return await response.json();
    } catch (error) {
      throw new FcfHttpError(`FCF endpoint returned invalid JSON for ${context}`, { cause: error });
    }
  }

  private backoffMs(attempt: number): number {
    const exponential = this.retryDelayMs * 2 ** attempt;
    const jitter = Math.random() * 100;
    return exponential + jitter;
  }
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
