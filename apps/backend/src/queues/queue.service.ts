import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { Queue, Worker, QueueOptions, WorkerOptions, Job } from 'bullmq';
import { RedisService } from '../common/redis/redis.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

export interface QueueJobData {
  [key: string]: any;
}

export interface QueueProcessor<T = QueueJobData> {
  process(job: Job<T>): Promise<any>;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    this.logger.info('Queue service initialized');
  }

  async onModuleDestroy() {
    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      this.logger.info(`Worker for queue ${name} closed`);
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      this.logger.info(`Queue ${name} closed`);
    }

    this.logger.info('Queue service shutdown complete');
  }

  /**
   * Create a new queue
   */
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
    this.logger.info(`Queue ${name} created`);

    return queue;
  }

  /**
   * Get an existing queue
   */
  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  /**
   * Fetch a job by id (queue must have been created or had jobs enqueued).
   */
  async getJob<T = QueueJobData>(queueName: string, jobId: string): Promise<Job<T> | undefined> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      return undefined;
    }
    const job = await queue.getJob(jobId);
    return job ?? undefined;
  }

  /**
   * Create a worker for processing jobs
   */
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
        this.logger.info(`Processing job ${job.id} from queue ${queueName}`);
        try {
          const result = await processor(job);
          this.logger.info(`Job ${job.id} completed successfully`);
          return result;
        } catch (error) {
          this.logger.error(`Job ${job.id} failed:`, error);
          throw error;
        }
      },
      {
        connection: this.redisService.getClient(),
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
        ...options,
      },
    );

    // Worker event listeners
    worker.on('completed', (job) => {
      this.logger.info(`Job ${job.id} completed in queue ${queueName}`);
    });

    worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed in queue ${queueName}:`, err);
    });

    worker.on('error', (err) => {
      this.logger.error(`Worker error in queue ${queueName}:`, err);
    });

    this.workers.set(queueName, worker);
    this.logger.info(`Worker for queue ${queueName} created`);

    return worker;
  }

  /**
   * Add a job to a queue
   */
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

    this.logger.info(`Job ${job.id} added to queue ${queueName}`);
    return job;
  }

  /**
   * Get job counts for a queue
   */
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
    
    // Ensure all required properties are present with default values
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: counts.paused || 0,
    };
  }

  /**
   * Get queue statistics
   */
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

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    this.logger.info(`Queue ${queueName} paused`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    this.logger.info(`Queue ${queueName} resumed`);
  }

  /**
   * Clear a queue (remove all jobs)
   */
  async clearQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.drain();
    this.logger.info(`Queue ${queueName} cleared`);
  }

  /**
   * Get all queue names
   */
  getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  /**
   * Check if queue exists
   */
  hasQueue(name: string): boolean {
    return this.queues.has(name);
  }

  /**
   * Check if worker exists
   */
  hasWorker(queueName: string): boolean {
    return this.workers.has(queueName);
  }
}
