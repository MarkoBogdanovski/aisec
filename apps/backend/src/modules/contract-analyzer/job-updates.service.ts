import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { JobRealtimeEnvelope, JobResultView } from './job-updates.types';

type SubscribedSocket = {
  socket: WebSocket;
  jobIds: Set<string>;
};

@Injectable()
export class JobUpdatesService implements OnModuleDestroy {
  private readonly logger = new Logger(JobUpdatesService.name);
  private readonly clients = new Set<SubscribedSocket>();
  private server?: WebSocketServer;

  attachServer(server: HttpServer): void {
    if (this.server) {
      return;
    }

    this.server = new WebSocketServer({ server, path: '/ws/jobs' });
    this.server.on('connection', (socket) => this.registerClient(socket));
    this.logger.log('WebSocket job updates available on /ws/jobs');
  }

  onModuleDestroy(): void {
    for (const client of this.clients) {
      client.socket.close();
    }
    this.clients.clear();
    this.server?.close();
  }

  publishJobStatus(update: JobResultView): void {
    this.broadcastToJob(update.job_id, {
      event: 'job.status',
      data: update as unknown as Record<string, unknown>,
    });
  }

  publishJobResult(update: JobResultView): void {
    this.broadcastToJob(update.job_id, {
      event: 'job.result',
      data: update as unknown as Record<string, unknown>,
    });
  }

  private registerClient(socket: WebSocket): void {
    const client: SubscribedSocket = { socket, jobIds: new Set() };
    this.clients.add(client);

    this.send(socket, {
      event: 'connection.ready',
      data: { path: '/ws/jobs' },
    });

    socket.on('message', (message) => {
      this.handleMessage(client, message.toString());
    });

    socket.on('close', () => {
      this.clients.delete(client);
    });

    socket.on('error', (error) => {
      this.logger.warn(`WebSocket client error: ${error.message}`);
      this.clients.delete(client);
    });
  }

  private handleMessage(client: SubscribedSocket, raw: string): void {
    try {
      const parsed = JSON.parse(raw) as { action?: string; jobId?: string };
      if (!parsed.jobId) {
        return;
      }

      if (parsed.action === 'subscribe') {
        client.jobIds.add(parsed.jobId);
        this.send(client.socket, {
          event: 'job.subscribed',
          data: { job_id: parsed.jobId },
        });
      }

      if (parsed.action === 'unsubscribe') {
        client.jobIds.delete(parsed.jobId);
        this.send(client.socket, {
          event: 'job.unsubscribed',
          data: { job_id: parsed.jobId },
        });
      }
    } catch (error) {
      this.logger.warn(`Invalid WebSocket payload: ${(error as Error).message}`);
    }
  }

  private broadcastToJob(jobId: string, payload: JobRealtimeEnvelope): void {
    for (const client of this.clients) {
      if (!client.jobIds.has(jobId)) {
        continue;
      }
      this.send(client.socket, payload);
    }
  }

  private send(socket: WebSocket, payload: JobRealtimeEnvelope): void {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify(payload));
  }
}
