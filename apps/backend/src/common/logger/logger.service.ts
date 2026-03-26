import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class LoggerService {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  // Convenience methods for different log levels
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, error?: Error | any, meta?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, { error: error.message, stack: error.stack, ...meta });
    } else {
      this.logger.error(message, { error, ...meta });
    }
  }

  // Context-aware logging
  logWithContext(context: string, message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info', meta?: any): void {
    this.logger[level](message, { context, ...meta });
  }

  // Performance logging
  logPerformance(operation: string, duration: number, meta?: any): void {
    this.logger.info(`Performance: ${operation} completed in ${duration}ms`, {
      operation,
      duration,
      type: 'performance',
      ...meta,
    });
  }

  // Security logging
  logSecurity(event: string, userId?: string, meta?: any): void {
    this.logger.warn(`Security Event: ${event}`, {
      event,
      userId,
      type: 'security',
      timestamp: new Date().toISOString(),
      ...meta,
    });
  }

  // Audit logging
  logAudit(action: string, userId: string, resource: string, meta?: any): void {
    this.logger.info(`Audit: ${action}`, {
      action,
      userId,
      resource,
      type: 'audit',
      timestamp: new Date().toISOString(),
      ...meta,
    });
  }

  // Get the underlying Winston logger for advanced usage
  getWinstonLogger(): Logger {
    return this.logger;
  }

  // Create a child logger with additional context
  child(defaultMeta: any): Logger {
    return this.logger.child(defaultMeta);
  }
}
