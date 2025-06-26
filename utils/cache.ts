import IORedis from 'ioredis';
import { env } from '../config/environment';
import logger from './logger';

class RedisService {
  private client: IORedis;

  constructor() {
    this.client = new IORedis({
      host: env.REDIS_HOST,
      port: parseInt(env.REDIS_PORT),
      password: env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.client.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    this.client.on('connect', () => {
      logger.info('Redis connected successfully');
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.set(key, value, 'EX', ttl);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis delete error:', error);
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async flushAll(): Promise<void> {
    await this.client.flushall();
  }

  async isConnected(): Promise<boolean> {
    return this.client.status === 'ready';
  }

  getClient(): IORedis {
    return this.client;
  }
}

export const redis = new RedisService(); 