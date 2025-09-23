// Logger class for structured logging
export class AuthLogger {
  private static formatLog(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${logData}`;
  }

  static info(message: string, data?: any): void {
    console.log(this.formatLog('INFO', message, data));
  }

  static warn(message: string, data?: any): void {
    console.warn(this.formatLog('WARN', message, data));
  }

  static error(message: string, error?: any, data?: any): void {
    const errorData = {
      ...data,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    };
    console.error(this.formatLog('ERROR', message, errorData));
  }

  static critical(message: string, error?: any, data?: any): void {
    const errorData = {
      ...data,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    };
    console.error(this.formatLog('CRITICAL', message, errorData));
  }
}