// Lightweight client-side logger to avoid importing server/shared logger
// Uses console in development; no-ops in production builds
type LogFn = (message?: any, ...optionalParams: any[]) => void;

const dev = import.meta.env.MODE !== 'production';

const make = (fn: LogFn): LogFn => (message?: any, ...optionalParams: any[]) => {
  if (dev) {
    // eslint-disable-next-line no-console
    fn(message, ...optionalParams);
  }
};

export const logger = {
  debug: make(console.debug.bind(console)),
  info: make(console.info.bind(console)),
  warn: make(console.warn.bind(console)),
  error: make(console.error.bind(console))
};

export default logger;

