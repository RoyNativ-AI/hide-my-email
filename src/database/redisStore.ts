/**
 * In-Memory Store with Redis
 * Zero-Knowledge: Only stores encrypted blobs
 * No persistent data, auto-expires after 90 days
 */

import Redis from 'ioredis';

export interface EncryptedAlias {
  id: string;
  userHash: string;           // Hash of user ID (unlinkable)
  aliasHash: string;          // Hash for routing
  encryptedBlob: string;      // Client-side encrypted data
  createdAt: number;
  lastUsed?: number;
  emailCount: number;
}

export class RedisStore {
  private client: Redis;
  private static instance: RedisStore;
  private connected: boolean = false;

  private constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    this.client = new Redis(redisUrl, {
      tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
      maxRetriesPerRequest: 3,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.connected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis connected');
      this.connected = true;
    });
  }

  public static getInstance(): RedisStore {
    if (!RedisStore.instance) {
      RedisStore.instance = new RedisStore();
    }
    return RedisStore.instance;
  }

  public async connect(): Promise<void> {
    // ioredis connects automatically
    if (this.client.status === 'ready') {
      this.connected = true;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }

  /**
   * Store encrypted alias
   * TTL: 90 days (auto-delete for privacy)
   */
  public async setAlias(alias: EncryptedAlias): Promise<void> {
    const key = `alias:${alias.aliasHash}`;
    const value = JSON.stringify(alias);

    // Store with 90 day expiry
    await this.client.setex(key, 90 * 24 * 60 * 60, value);
  }

  /**
   * Get alias by hash (for routing)
   */
  public async getAliasByHash(aliasHash: string): Promise<EncryptedAlias | null> {
    const key = `alias:${aliasHash}`;
    const value = await this.client.get(key);

    if (!value) return null;

    return JSON.parse(value);
  }

  /**
   * Get all aliases for a user (by user hash)
   */
  public async getAliasesByUserHash(userHash: string): Promise<EncryptedAlias[]> {
    const keys = await this.client.keys('alias:*');
    const aliases: EncryptedAlias[] = [];

    for (const key of keys) {
      const value = await this.client.get(key);
      if (value) {
        const alias = JSON.parse(value);
        if (alias.userHash === userHash) {
          aliases.push(alias);
        }
      }
    }

    return aliases;
  }

  /**
   * Update last used timestamp
   */
  public async touchAlias(aliasHash: string): Promise<void> {
    const alias = await this.getAliasByHash(aliasHash);
    if (!alias) return;

    alias.lastUsed = Date.now();
    alias.emailCount++;

    await this.setAlias(alias);
  }

  /**
   * Delete alias
   */
  public async deleteAlias(aliasHash: string): Promise<void> {
    const key = `alias:${aliasHash}`;
    await this.client.del(key);
  }

  /**
   * Check if alias exists
   */
  public async aliasExists(aliasHash: string): Promise<boolean> {
    const key = `alias:${aliasHash}`;
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  /**
   * Get total alias count (for metrics only)
   */
  public async getTotalAliasCount(): Promise<number> {
    const keys = await this.client.keys('alias:*');
    return keys.length;
  }

  /**
   * Clear all data (for testing/development)
   */
  public async flushAll(): Promise<void> {
    await this.client.flushall();
    console.log('All Redis data cleared');
  }
}

// Export singleton
export const redis = RedisStore.getInstance();
