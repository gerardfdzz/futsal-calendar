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
