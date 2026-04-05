import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import type { AppLogLevel, DevLogEntry } from './logger.types';

type LogListener = (entry: DevLogEntry) => void;

@Injectable()
export class LoggerService {
  private readonly eventBus = new EventEmitter();
  private readonly recentLogs: DevLogEntry[] = [];
  private readonly maxRecentLogs = 300;

  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  debug(message: string, meta?: Record<string, unknown>): void {
    this.write('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write('warn', message, meta);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    if (error instanceof Error) {
      this.write('error', message, {
        ...meta,
        error: error.message,
        stack: error.stack,
      });
      return;
    }

    this.write('error', message, {
      ...meta,
      ...(error !== undefined ? { error } : {}),
    });
  }

  logWithContext(
    context: string,
    message: string,
    level: AppLogLevel = 'info',
    meta?: Record<string, unknown>,
  ): void {
    this.write(level, message, {
      ...meta,
      context,
      type: meta?.type ?? 'context',
    });
  }

  logPerformance(operation: string, duration: number, meta?: Record<string, unknown>): void {
    this.write('info', `Performance: ${operation} completed in ${duration}ms`, {
      ...meta,
      operation,
      duration,
      context: meta?.context ?? 'performance',
      type: 'performance',
    });
  }

  logSecurity(event: string, userId?: string, meta?: Record<string, unknown>): void {
    this.write('warn', `Security Event: ${event}`, {
      ...meta,
      event,
      userId,
      type: 'security',
      timestamp: new Date().toISOString(),
    });
  }

  logAudit(action: string, userId: string, resource: string, meta?: Record<string, unknown>): void {
    this.write('info', `Audit: ${action}`, {
      ...meta,
      action,
      userId,
      resource,
      type: 'audit',
      timestamp: new Date().toISOString(),
    });
  }

  subscribe(listener: LogListener): () => void {
    this.eventBus.on('log', listener);
    return () => {
      this.eventBus.off('log', listener);
    };
  }

  getRecentLogs(): DevLogEntry[] {
    return [...this.recentLogs];
  }

  isDevMode(): boolean {
    return process.env.NODE_ENV !== 'production';
  }

  getWinstonLogger(): Logger {
    return this.logger;
  }

  child(defaultMeta: Record<string, unknown>): Logger {
    return this.logger.child(defaultMeta);
  }

  private write(level: AppLogLevel, message: string, meta?: Record<string, unknown>): void {
    this.logger[level](message, meta);

    if (!this.isDevMode()) {
      return;
    }

    const entry: DevLogEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      message,
      context: typeof meta?.context === 'string' ? meta.context : undefined,
      type: typeof meta?.type === 'string' ? meta.type : undefined,
      meta,
    };

    this.recentLogs.push(entry);
    if (this.recentLogs.length > this.maxRecentLogs) {
      this.recentLogs.shift();
    }

    this.eventBus.emit('log', entry);
  }
}
