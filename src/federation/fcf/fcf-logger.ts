/**
 * Minimal logging port used across the `federation/fcf` layer. Deliberately
 * tiny (no levels beyond what we actually call, no structured-logging
 * framework) — inject a real logger (pino, Vercel's own logging, etc.) by
 * implementing this interface; tests inject a spy/no-op instead of
 * mocking `console`.
 */
export interface FcfLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export const consoleFcfLogger: FcfLogger = {
  info: (message, context) => console.info(`[fcf] ${message}`, context ?? ''),
  warn: (message, context) => console.warn(`[fcf] ${message}`, context ?? ''),
  error: (message, context) => console.error(`[fcf] ${message}`, context ?? ''),
};

export const noopFcfLogger: FcfLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};
