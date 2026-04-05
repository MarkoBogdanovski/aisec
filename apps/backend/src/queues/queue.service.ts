import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, QueueOptions, WorkerOptions, Job } from 'bullmq';
import { RedisService } from '../common/redis/redis.service';
import { LoggerService } from '../common/logger/logger.service';

export interface QueueJobData {
  [key: string]: any;
}

export interface QueueProcessor<T = QueueJobData> {
  process(job: Job<T>): Promise<any>;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly context = QueueService.name;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  constructor(
    private readonly logger: LoggerService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    this.logger.logWithContext(this.context, 'Queue service initialized');
  }

  async onModuleDestroy() {
    for (const [name, worker] of this.workers) {
      await worker.close();
      this.logger.logWithContext(this.context, `Worker for queue ${name} closed`);
    }

    for (const [name, queue] of this.queues) {
      await queue.close();
      this.logger.logWithContext(this.context, `Queue ${name} closed`);
    }

    this.logger.logWithContext(this.context, 'Queue service shutdown complete');
  }

  createQueue(name: string, options?: Partial<QueueOptions>): Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const queue = new Queue(name, {
      connection: this.redisService.getClient(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
      ...options,
    });

    this.queues.set(name, queue);
    this.logger.logWithContext(this.context, `Queue ${name} created`, 'info', {
      queueName: name,
      type: 'queue',
    });

    return queue;
  }

  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  async getJob<T = QueueJobData>(queueName: string, jobId: string): Promise<Job<T> | undefined> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      return undefined;
    }
    const job = await queue.getJob(jobId);
    return job ?? undefined;
  }

  createWorker<T = QueueJobData>(
    queueName: string,
    processor: QueueProcessor<T>['process'],
    options?: Partial<WorkerOptions>,
  ): Worker {
    if (this.workers.has(queueName)) {
      throw new Error(`Worker for queue ${queueName} already exists`);
    }

    const worker = new Worker(
      queueName,
      async (job: Job<T>) => {
        const startedAt = Date.now();
        this.logger.logWithContext(this.context, `Processing job ${job.id} from queue ${queueName}`, 'info', {
          queueName,
          jobId: String(job.id),
          type: 'queue-job',
        });
        try {
          const result = await processor(job);
          this.logger.logPerformance(`queue:${queueName}:job:${job.id}`, Date.now() - startedAt, {
            context: this.context,
            queueName,
            jobId: String(job.id),
          });
          this.logger.logWithContext(this.context, `Job ${job.id} completed successfully`, 'info', {
            queueName,
            jobId: String(job.id),
            type: 'queue-job',
          });
          return result;
        } catch (error) {
          this.logger.error(`Job ${job.id} failed`, error, {
            context: this.context,
            queueName,
            jobId: String(job.id),
            type: 'queue-job',
          });
          throw error;
        }
      },
      {
        connection: this.redisService.getClient(),
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
        ...options,
      },
    );

    worker.on('completed', (job) => {
      this.logger.logWithContext(this.context, `Job ${job.id} completed in queue ${queueName}`, 'info', {
        queueName,
        jobId: String(job.id),
        type: 'queue-job',
      });
    });

    worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed in queue ${queueName}`, err, {
        context: this.context,
        queueName,
        jobId: job?.id ? String(job.id) : undefined,
        type: 'queue-job',
      });
    });

    worker.on('error', (err) => {
      this.logger.error(`Worker error in queue ${queueName}`, err, {
        context: this.context,
        queueName,
        type: 'queue',
      });
    });

    this.workers.set(queueName, worker);
    this.logger.logWithContext(this.context, `Worker for queue ${queueName} created`, 'info', {
      queueName,
      type: 'queue',
    });

    return worker;
  }

  async addJob<T = QueueJobData>(
    queueName: string,
    jobName: string,
    data: T,
    options?: any,
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName) || this.createQueue(queueName);

    const job = await queue.add(jobName, data, {
      delay: 0,
      ...options,
    });

    this.logger.logWithContext(this.context, `Job ${job.id} added to queue ${queueName}`, 'info', {
      queueName,
      jobName,
      jobId: String(job.id),
      type: 'queue-job',
    });
    return job;
  }

  async getJobCounts(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const counts = await queue.getJobCounts();
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: counts.paused || 0,
    };
  }

  async getQueueStats(queueName: string): Promise<any> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const counts = await queue.getJobCounts();
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();

    return {
      name: queueName,
      counts,
      jobs: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      },
    };
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    this.logger.logWithContext(this.context, `Queue ${queueName} paused`, 'info', {
      queueName,
      type: 'queue',
    });
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    this.logger.logWithContext(this.context, `Queue ${queueName} resumed`, 'info', {
      queueName,
      type: 'queue',
    });
  }

  async clearQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.drain();
    this.logger.logWithContext(this.context, `Queue ${queueName} cleared`, 'info', {
      queueName,
      type: 'queue',
    });
  }

  getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  hasQueue(name: string): boolean {
    return this.queues.has(name);
  }

  hasWorker(queueName: string): boolean {
    return this.workers.has(queueName);
  }
}
