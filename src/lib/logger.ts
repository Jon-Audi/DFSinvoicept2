/**
 * Structured Logging Utility for Production
 * 
 * Provides consistent, secure logging patterns for production deployment.
 * - Removes debug logs in production
 * - Masks sensitive data
 * - Structures logs for monitoring services
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  context?: string;
  userId?: string;
  action?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  }

  /**
   * Log info messages
   */
  info(message: string, context?: LogContext) {
    console.info(`[INFO] ${message}`, this.sanitize(context));
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext) {
    console.warn(`[WARN] ${message}`, this.sanitize(context));
  }

  /**
   * Log errors with sanitization
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log sanitized error
    console.error(
      `[ERROR] ${message}: ${errorMessage}`,
      {
        ...this.sanitize(context),
        ...(this.isDevelopment && { stack: errorStack }),
      }
    );
  }

  /**
   * Remove sensitive data from logs
   */
  private sanitize(data?: LogContext): LogContext | undefined {
    if (!data) return undefined;

    const sanitized = { ...data };
    const sensitiveKeys = [
      'password',
      'token',
      'apiKey',
      'secret',
      'Authorization',
      'email',
      'phone',
      'ssn',
      'creditCard',
      'apiKeyValue',
    ];

    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Create a scoped logger for a specific context
   */
  scope(context: string) {
    return {
      debug: (msg: string, ctx?: LogContext) => 
        this.debug(msg, { ...ctx, context }),
      info: (msg: string, ctx?: LogContext) => 
        this.info(msg, { ...ctx, context }),
      warn: (msg: string, ctx?: LogContext) => 
        this.warn(msg, { ...ctx, context }),
      error: (msg: string, err?: Error | unknown, ctx?: LogContext) => 
        this.error(msg, err, { ...ctx, context }),
    };
  }
}

export const logger = new Logger();

// Create scoped loggers for different parts of the app
export const firebaseLogger = logger.scope('Firebase');
export const authLogger = logger.scope('Auth');
export const apiLogger = logger.scope('API');
export const formLogger = logger.scope('Form');
