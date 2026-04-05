import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { LoggerService } from './logger.service';
import type { DevLogEntry } from './logger.types';

@Injectable()
export class DevConsoleService implements OnModuleDestroy {
  private readonly clients = new Set<WebSocket>();
  private server?: WebSocketServer;
  private unsubscribe?: () => void;

  constructor(private readonly loggerService: LoggerService) {}

  attachServer(server: HttpServer): void {
    if (!this.loggerService.isDevMode() || this.server) {
      return;
    }

    this.server = new WebSocketServer({ server, path: '/ws/dev-console' });
    this.server.on('connection', (socket) => this.handleConnection(socket));
    this.unsubscribe = this.loggerService.subscribe((entry) => {
      this.broadcast({
        event: 'log.entry',
        data: entry,
      });
    });
    this.loggerService.logWithContext('DevConsoleService', 'Dev console websocket attached', 'info', {
      path: '/ws/dev-console',
      type: 'dev-console',
    });
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
    for (const socket of this.clients) {
      socket.close();
    }
    this.clients.clear();
    this.server?.close();
  }

  private handleConnection(socket: WebSocket): void {
    this.clients.add(socket);
    this.send(socket, {
      event: 'connection.ready',
      data: {
        path: '/ws/dev-console',
        recent: this.loggerService.getRecentLogs(),
      },
    });

    socket.on('close', () => {
      this.clients.delete(socket);
    });

    socket.on('error', (error) => {
      this.loggerService.logWithContext('DevConsoleService', 'Dev console client error', 'warn', {
        type: 'dev-console',
        error: error.message,
      });
      this.clients.delete(socket);
    });
  }

  private broadcast(payload: { event: string; data: DevLogEntry | { path: string; recent: DevLogEntry[] } }): void {
    for (const socket of this.clients) {
      this.send(socket, payload);
    }
  }

  private send(socket: WebSocket, payload: { event: string; data: unknown }): void {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify(payload));
  }
}
