import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly context = RedisService.name;
  private client: Redis;
  private publisher: Redis;
  private subscriber: Redis;

  constructor(private readonly logger: LoggerService) {}

  async onModuleInit() {
    const startedAt = Date.now();
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB, 10) || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };

    try {
      this.client = new Redis(redisConfig);
      this.publisher = new Redis(redisConfig);
      this.subscriber = new Redis(redisConfig);

      this.client.on('connect', () => {
        this.logger.logWithContext(this.context, 'Redis client connected', 'info', {
          type: 'redis',
        });
      });

      this.client.on('error', (err) => {
        this.logger.error('Redis client error', err, {
          context: this.context,
          type: 'redis',
        });
      });

      this.client.on('close', () => {
        this.logger.logWithContext(this.context, 'Redis client connection closed', 'info', {
          type: 'redis',
        });
      });

      await this.client.connect();
      await this.publisher.connect();
      await this.subscriber.connect();

      this.logger.logPerformance('redis-connect', Date.now() - startedAt, {
        context: this.context,
      });
      this.logger.logWithContext(this.context, 'Redis connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error, {
        context: this.context,
        type: 'redis',
      });
      throw error;
    }
  }

  async onModuleDestroy() {
    const startedAt = Date.now();
    if (this.client) {
      await this.client.disconnect();
    }
    if (this.publisher) {
      await this.publisher.disconnect();
    }
    if (this.subscriber) {
      await this.subscriber.disconnect();
    }
    this.logger.logPerformance('redis-disconnect', Date.now() - startedAt, {
      context: this.context,
    });
    this.logger.logWithContext(this.context, 'Redis disconnected');
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    if (ttl) {
      return this.client.setex(key, ttl, value);
    }
    return this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, field: string): Promise<number> {
    return this.client.hdel(key, field);
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.client.rpush(key, ...values);
  }

  async lpop(key: string): Promise<string | null> {
    return this.client.lpop(key);
  }

  async rpop(key: string): Promise<string | null> {
    return this.client.rpop(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  async sismember(key: string, member: string): Promise<number> {
    return this.client.sismember(key, member);
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.publisher.publish(channel, message);
  }

  async subscribe(channel: string, callback: (channel: string, message: string) => void): Promise<void> {
    this.subscriber.subscribe(channel);
    this.subscriber.on('message', callback);
  }

  getClient(): Redis {
    return this.client;
  }

  getPublisher(): Redis {
    return this.publisher;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }
}
