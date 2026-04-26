import { randomUUID } from "node:crypto";
import type { AppLogLevel, DevLogEntry } from "./types";

class ServerLogger {
  private readonly recentLogs: DevLogEntry[] = [];
  private readonly maxRecentLogs = 300;

  debug(message: string, meta?: Record<string, unknown>) {
    this.write("debug", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.write("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.write("warn", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.write("error", message, meta);
  }

  logWithContext(
    context: string,
    message: string,
    level: AppLogLevel = "info",
    meta?: Record<string, unknown>,
  ) {
    this.write(level, message, {
      ...meta,
      context,
      type: meta?.type ?? "context",
    });
  }

  logPerformance(operation: string, duration: number, meta?: Record<string, unknown>) {
    this.write("info", `Performance: ${operation} completed in ${duration}ms`, {
      ...meta,
      operation,
      duration,
      context: meta?.context ?? "performance",
      type: "performance",
    });
  }

  getRecentLogs() {
    return [...this.recentLogs];
  }

  private write(level: AppLogLevel, message: string, meta?: Record<string, unknown>) {
    const entry: DevLogEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      message,
      context: typeof meta?.context === "string" ? meta.context : undefined,
      type: typeof meta?.type === "string" ? meta.type : undefined,
      meta,
    };

    this.recentLogs.push(entry);
    if (this.recentLogs.length > this.maxRecentLogs) {
      this.recentLogs.shift();
    }

    const method = level === "debug" ? "debug" : level === "info" ? "info" : level === "warn" ? "warn" : "error";
    console[method](message, meta ?? {});
  }
}

export const logger = new ServerLogger();
