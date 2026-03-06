/**
 * In-Memory Store with Redis Backup
 * Perfect for:
 * - Development
 * - Testing
 * - Privacy-first deployments
 * - Production with persistence
 *
 * Features:
 * - Fast in-memory access
 * - Automatic Redis backup for persistence
 * - Data survives server restarts
 */

import Redis from 'ioredis';

export interface EncryptedAlias {
  id: string;
  userHash: string;
  aliasHash: string;
  encryptedBlob: string;      // All sensitive data encrypted client-side
  status: 'active' | 'inactive' | 'disabled';
  createdAt: number;
  lastUsed?: number;
  emailCount: number;
}

export class MemoryStore {
  private static instance: MemoryStore;
  private aliases: Map<string, EncryptedAlias> = new Map();
  private userAliases: Map<string, Set<string>> = new Map();
  private lastSenders: Map<string, string> = new Map(); // aliasHash -> last sender email
  private aliasRecipients: Map<string, string> = new Map(); // alias full address -> recipient email
  private redis: Redis | null = null;
  private redisConnected: boolean = false;

  private constructor() {
    console.log('Memory Store initialized with Redis backup');
    this.initRedis();
  }

  private async initRedis(): Promise<void> {
    if (!process.env.REDIS_URL) {
      console.log('No REDIS_URL found - running in memory-only mode');
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL;
      this.redis = new Redis(redisUrl, {
        tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: 3,
      });

      this.redis.on('error', (err) => {
        console.error('Redis Error:', err);
        this.redisConnected = false;
      });

      this.redis.on('connect', () => {
        this.redisConnected = true;
        console.log('Redis connected - data will persist across restarts');
      });

      this.redis.on('ready', async () => {
        // Load existing data from Redis
        await this.loadFromRedis();
      });
    } catch (error) {
      console.error('Redis connection failed:', error);
      console.log('Falling back to memory-only mode');
    }
  }

  public static getInstance(): MemoryStore {
    if (!MemoryStore.instance) {
      MemoryStore.instance = new MemoryStore();
    }
    return MemoryStore.instance;
  }

  /**
   * Create new alias
   */
  public createAlias(alias: EncryptedAlias): void {
    // Store by alias hash for quick routing
    this.aliases.set(alias.aliasHash, alias);

    // Index by user hash
    if (!this.userAliases.has(alias.userHash)) {
      this.userAliases.set(alias.userHash, new Set());
    }
    this.userAliases.get(alias.userHash)!.add(alias.aliasHash);

    console.log(`Alias created: ${alias.id} (total: ${this.aliases.size})`);

    // Backup to Redis
    this.saveToRedis();
  }

  /**
   * Get alias by hash (for email routing)
   */
  public getAliasByHash(aliasHash: string): EncryptedAlias | null {
    return this.aliases.get(aliasHash) || null;
  }

  /**
   * Get all aliases for a user
   */
  public getAliasesByUserHash(userHash: string): EncryptedAlias[] {
    const aliasHashes = this.userAliases.get(userHash);
    if (!aliasHashes) return [];

    const result: EncryptedAlias[] = [];
    for (const hash of aliasHashes) {
      const alias = this.aliases.get(hash);
      if (alias) {
        result.push(alias);
      }
    }

    return result.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Update alias status
   */
  public updateAliasStatus(aliasHash: string, status: 'active' | 'inactive' | 'disabled'): boolean {
    const alias = this.aliases.get(aliasHash);
    if (!alias) return false;

    alias.status = status;
    this.aliases.set(aliasHash, alias);
    this.saveToRedis();
    return true;
  }

  /**
   * Touch alias (update last used)
   */
  public touchAlias(aliasHash: string): void {
    const alias = this.aliases.get(aliasHash);
    if (!alias) return;

    alias.lastUsed = Date.now();
    alias.emailCount++;
    this.aliases.set(aliasHash, alias);
    this.saveToRedis();
  }

  /**
   * Delete alias
   */
  public deleteAlias(aliasHash: string, userHash: string): boolean {
    const alias = this.aliases.get(aliasHash);
    if (!alias || alias.userHash !== userHash) {
      return false;
    }

    this.aliases.delete(aliasHash);

    const userSet = this.userAliases.get(userHash);
    if (userSet) {
      userSet.delete(aliasHash);
    }

    console.log(`Alias deleted: ${alias.id}`);
    this.saveToRedis();
    return true;
  }

  /**
   * Get stats
   */
  public getStats() {
    return {
      totalAliases: this.aliases.size,
      totalUsers: this.userAliases.size,
      activeAliases: Array.from(this.aliases.values()).filter(a => a.status === 'active').length,
    };
  }

  /**
   * Set last sender for an alias (for bi-directional anonymous replies)
   */
  public setLastSender(aliasAddress: string, senderEmail: string): void {
    this.lastSenders.set(aliasAddress, senderEmail);
    this.saveToRedis();
  }

  /**
   * Get last sender for an alias
   */
  public getLastSender(aliasAddress: string): string | null {
    return this.lastSenders.get(aliasAddress) || null;
  }

  /**
   * Set recipient for an alias (for bi-directional routing)
   */
  public setAliasRecipient(aliasAddress: string, recipientEmail: string): void {
    this.aliasRecipients.set(aliasAddress, recipientEmail);
    this.saveToRedis();
  }

  /**
   * Get recipient for an alias
   */
  public getAliasRecipient(aliasAddress: string): string | null {
    return this.aliasRecipients.get(aliasAddress) || null;
  }

  /**
   * Save all data to Redis
   */
  private async saveToRedis(): Promise<void> {
    if (!this.redisConnected || !this.redis) return;

    try {
      const data = {
        aliases: Array.from(this.aliases.entries()),
        userAliases: Array.from(this.userAliases.entries()).map(([k, v]) => [k, Array.from(v)]),
        lastSenders: Array.from(this.lastSenders.entries()),
        aliasRecipients: Array.from(this.aliasRecipients.entries()),
      };

      await this.redis.set('memorystore:backup', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to Redis:', error);
    }
  }

  /**
   * Load all data from Redis
   */
  private async loadFromRedis(): Promise<void> {
    if (!this.redisConnected || !this.redis) return;

    try {
      const backup = await this.redis.get('memorystore:backup');
      if (!backup) {
        console.log('No backup found in Redis - starting fresh');
        return;
      }

      const data = JSON.parse(backup);

      // Restore aliases
      this.aliases = new Map(data.aliases);

      // Restore user aliases (convert arrays back to Sets)
      this.userAliases = new Map(data.userAliases.map(([k, v]: [string, string[]]) => [k, new Set(v)]));

      // Restore last senders
      this.lastSenders = new Map(data.lastSenders);

      // Restore alias recipients
      this.aliasRecipients = new Map(data.aliasRecipients);

      console.log(`Restored ${this.aliases.size} aliases from Redis backup`);
    } catch (error) {
      console.error('Failed to load from Redis:', error);
    }
  }

  /**
   * Clear all data (for testing)
   */
  public clearAll(): void {
    this.aliases.clear();
    this.userAliases.clear();
    this.lastSenders.clear();
    this.aliasRecipients.clear();
    this.saveToRedis(); // Clear Redis too
    console.log('All data cleared');
  }
}

// Export singleton
export const memoryStore = MemoryStore.getInstance();
