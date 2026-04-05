export type AppLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface DevLogEntry {
  id: string;
  timestamp: string;
  level: AppLogLevel;
  message: string;
  context?: string;
  type?: string;
  meta?: Record<string, unknown>;
}
