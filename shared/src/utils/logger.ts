export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile?: boolean;
  fileName?: string;
}

class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    // Check for development mode across different environments
    const isDev = 
      (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') ||
      (typeof globalThis !== 'undefined' && (globalThis as any).__DEV__) ||
      false;

    this.config = {
      level: isDev ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: isDev,
      enableFile: false,
      ...config
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private formatMessage(level: string, message: any, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ') : '';
    return `[${timestamp}] ${level}: ${message}${formattedArgs}`;
  }

  error(message: any, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR) && this.config.enableConsole) {
      console.error(this.formatMessage('ERROR', message, ...args));
    }
  }

  warn(message: any, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN) && this.config.enableConsole) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  info(message: any, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO) && this.config.enableConsole) {
      console.info(this.formatMessage('INFO', message, ...args));
    }
  }

  debug(message: any, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG) && this.config.enableConsole) {
      console.log(this.formatMessage('DEBUG', message, ...args));
    }
  }

  trace(message: any, ...args: any[]): void {
    if (this.shouldLog(LogLevel.TRACE) && this.config.enableConsole) {
      console.log(this.formatMessage('TRACE', message, ...args));
    }
  }

  // Legacy console.log replacement - maps to debug level
  log(message: any, ...args: any[]): void {
    this.debug(message, ...args);
  }
}

// Create default logger instance
export const logger = new Logger();

// Export logger creation function for custom configurations
export const createLogger = (config?: Partial<LoggerConfig>) => new Logger(config);