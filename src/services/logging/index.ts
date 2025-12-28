type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: unknown;
  stack?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 500;
  private isDev = import.meta.env.DEV;

  private log(level: LogLevel, message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    if (data instanceof Error) {
      entry.stack = data.stack;
    }

    this.logs.push(entry);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output in dev
    if (this.isDev) {
      const style = this.getConsoleStyle(level);
      console.log(`%c[${level.toUpperCase()}] ${message}`, style, data);
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      debug: 'color: #888; font-weight: normal;',
      info: 'color: #2563eb; font-weight: bold;',
      warn: 'color: #f59e0b; font-weight: bold;',
      error: 'color: #ef4444; font-weight: bold;',
    };
    return styles[level];
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (!level) return this.logs;
    return this.logs.filter((log) => log.level === level);
  }

  getRecent(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  clear() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();

// Global error handler
window.addEventListener('error', (event) => {
  logger.error('❌ Uncaught error:', event.error);
});

// Global promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  logger.error('❌ Unhandled promise rejection:', event.reason);
});
