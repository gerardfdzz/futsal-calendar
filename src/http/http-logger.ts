/**
 * Minimal logging port for the HTTP layer — mirrors the same tiny
 * pattern as `federation/fcf/fcf-logger.ts`, kept as its own file so the
 * HTTP layer doesn't need to depend on anything FCF-specific.
 */
export interface HttpLogger {
  error(message: string, context?: Record<string, unknown>): void;
}

export const consoleHttpLogger: HttpLogger = {
  error: (message, context) => console.error(`[calendar-http-handler] ${message}`, context ?? ''),
};

export const noopHttpLogger: HttpLogger = {
  error: () => {},
};
