/**
 * Minimal logging port for the HTTP layer — mirrors the same tiny
 * pattern as `federation/fcf/fcf-logger.ts` (inject a real logger in
 * production, inject `noopHttpLogger` in tests instead of mocking
 * `console`), kept as its own file rather than imported from the FCF
 * layer so the HTTP layer doesn't need to depend on anything
 * FCF-specific — it isolates the FCF, not the other way around.
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
