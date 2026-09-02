export interface HttpLogger {
  error(message: string, context?: Record<string, unknown>): void;
}

export const consoleHttpLogger: HttpLogger = {
  error: (message, context) => console.error(`[calendar-http-handler] ${message}`, context ?? ''),
};

export const noopHttpLogger: HttpLogger = {
  error: () => {},
};
