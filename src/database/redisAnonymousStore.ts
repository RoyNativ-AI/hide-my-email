/**
 * Redis-backed Anonymous Store
 * Zero-Knowledge with Persistence
 *
 * Same as anonymousStore.ts but data persists across restarts
 */

import Redis from 'ioredis';
import crypto from 'crypto';

export interface AnonymousSession {
  sessionToken: string;
  aliasHash: string;
  encryptedBlob: string;
  createdAt: number;
  lastUsed?: number;
  emailCount: number;
  status: 'active' | 'inactive' | 'disabled';
  expiresAt?: number;
}

export interface EmailLog {
  id: string;
  aliasHash: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  subject: string;
  bodyPreview?: string;
  status: 'delivered' | 'failed' | 'pending';
  messageId?: string;
  error?: string;
  timestamp: number;
}

export class RedisAnonymousStore {
  private static instance: RedisAnonymousStore;
  private client: Redis;
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
      console.log('Redis connected (Anonymous Store with persistence)');
      this.connected = true;
    });

    this.client.on('ready', () => {
      console.log('Zero-Knowledge mode active with Redis persistence');
    });
  }

  public static getInstance(): RedisAnonymousStore {
    if (!RedisAnonymousStore.instance) {
      RedisAnonymousStore.instance = new RedisAnonymousStore();
    }
    return RedisAnonymousStore.instance;
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
   * Generate cryptographically secure session token
   */
  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create new anonymous session
   */
  public async createSession(
    aliasHash: string,
    encryptedBlob: string,
    ttlDays?: number
  ): Promise<string> {
    const sessionToken = this.generateSessionToken();

    const session: AnonymousSession = {
      sessionToken,
      aliasHash,
      encryptedBlob,
      createdAt: Date.now(),
      emailCount: 0,
      status: 'active',
    };

    if (ttlDays) {
      session.expiresAt = Date.now() + (ttlDays * 24 * 60 * 60 * 1000);
    }

    // Store in Redis with two keys for different lookups:
    // 1. session:token -> full session data
    // 2. alias:hash -> session token (for email routing)

    const sessionKey = `session:${sessionToken}`;
    const aliasKey = `alias:${aliasHash}`;
    const ttlSeconds = ttlDays ? ttlDays * 24 * 60 * 60 : 90 * 24 * 60 * 60; // Default 90 days

    await this.client.setex(sessionKey, ttlSeconds, JSON.stringify(session));
    await this.client.setex(aliasKey, ttlSeconds, sessionToken);

    console.log(`✅ Session created: ${sessionToken.substring(0, 8)}... (expires: ${ttlDays || 90} days, persisted to Redis)`);

    return sessionToken;
  }

  /**
   * Get session by token
   */
  public async getSessionByToken(sessionToken: string): Promise<AnonymousSession | null> {
    const sessionKey = `session:${sessionToken}`;
    const data = await this.client.get(sessionKey);

    if (!data) return null;

    const session: AnonymousSession = JSON.parse(data);

    // Check expiration
    if (session.expiresAt && session.expiresAt < Date.now()) {
      await this.deleteSession(sessionToken);
      return null;
    }

    return session;
  }

  /**
   * Get session by alias hash (for email routing)
   */
  public async getSessionByAliasHash(aliasHash: string): Promise<AnonymousSession | null> {
    const aliasKey = `alias:${aliasHash}`;
    const sessionToken = await this.client.get(aliasKey);

    if (!sessionToken) return null;

    return this.getSessionByToken(sessionToken);
  }

  /**
   * Update session blob
   */
  public async updateSession(sessionToken: string, encryptedBlob: string): Promise<boolean> {
    const session = await this.getSessionByToken(sessionToken);
    if (!session) return false;

    session.encryptedBlob = encryptedBlob;

    const sessionKey = `session:${sessionToken}`;
    const ttl = await this.client.ttl(sessionKey);

    if (ttl > 0) {
      await this.client.setex(sessionKey, ttl, JSON.stringify(session));
    } else {
      await this.client.set(sessionKey, JSON.stringify(session));
    }

    console.log(`📝 Session updated: ${sessionToken.substring(0, 8)}...`);
    return true;
  }

  /**
   * Update session status
   */
  public async updateSessionStatus(
    sessionToken: string,
    status: 'active' | 'inactive' | 'disabled'
  ): Promise<boolean> {
    const session = await this.getSessionByToken(sessionToken);
    if (!session) return false;

    session.status = status;

    const sessionKey = `session:${sessionToken}`;
    const ttl = await this.client.ttl(sessionKey);

    if (ttl > 0) {
      await this.client.setex(sessionKey, ttl, JSON.stringify(session));
    } else {
      await this.client.set(sessionKey, JSON.stringify(session));
    }

    console.log(`🔄 Session status: ${sessionToken.substring(0, 8)}... → ${status}`);
    return true;
  }

  /**
   * Touch session (update last used, increment counter)
   */
  public async touchSession(sessionToken: string): Promise<void> {
    const session = await this.getSessionByToken(sessionToken);
    if (!session) return;

    session.lastUsed = Date.now();
    session.emailCount++;

    const sessionKey = `session:${sessionToken}`;
    const ttl = await this.client.ttl(sessionKey);

    if (ttl > 0) {
      await this.client.setex(sessionKey, ttl, JSON.stringify(session));
    }
  }

  /**
   * Delete session
   */
  public async deleteSession(sessionToken: string): Promise<boolean> {
    const session = await this.getSessionByToken(sessionToken);
    if (!session) return false;

    const sessionKey = `session:${sessionToken}`;
    const aliasKey = `alias:${session.aliasHash}`;

    await this.client.del(sessionKey);
    await this.client.del(aliasKey);

    console.log(`🗑️  Session deleted: ${sessionToken.substring(0, 8)}...`);
    return true;
  }

  /**
   * Get multiple sessions by tokens
   */
  public async getSessionsByTokens(sessionTokens: string[]): Promise<AnonymousSession[]> {
    const sessions: AnonymousSession[] = [];

    for (const token of sessionTokens) {
      const session = await this.getSessionByToken(token);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Cleanup expired sessions
   */
  public async cleanupExpired(): Promise<number> {
    // Redis TTL handles this automatically
    // This method exists for compatibility but is a no-op
    console.log('ℹ️  Redis handles expiration automatically via TTL');
    return 0;
  }

  /**
   * Get stats
   */
  public async getStats() {
    const sessionKeys = await this.client.keys('session:*');
    let totalEmails = 0;
    let activeSessions = 0;

    for (const key of sessionKeys) {
      const data = await this.client.get(key);
      if (data) {
        const session: AnonymousSession = JSON.parse(data);
        totalEmails += session.emailCount;
        if (session.status === 'active') activeSessions++;
      }
    }

    return {
      totalSessions: sessionKeys.length,
      activeSessions,
      totalEmailsForwarded: totalEmails,
      storage: 'Redis (persistent)',
    };
  }

  /**
   * Clear all (for testing)
   */
  public async clearAll(): Promise<void> {
    const sessionKeys = await this.client.keys('session:*');
    const aliasKeys = await this.client.keys('alias:*');

    if (sessionKeys.length > 0) {
      await this.client.del(sessionKeys);
    }
    if (aliasKeys.length > 0) {
      await this.client.del(aliasKeys);
    }

    console.log('⚠️  All sessions cleared from Redis');
  }

  /**
   * Backup all sessions to JSON
   */
  public async exportBackup(): Promise<string> {
    const sessionKeys = await this.client.keys('session:*');
    const sessions = [];

    for (const key of sessionKeys) {
      const data = await this.client.get(key);
      if (data) {
        sessions.push(JSON.parse(data));
      }
    }

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalSessions: sessions.length,
      sessions,
    }, null, 2);
  }

  /**
   * Add email log entry
   */
  public async addEmailLog(log: EmailLog): Promise<void> {
    const logKey = `logs:${log.aliasHash}`;
    const logEntry = JSON.stringify(log);

    // Add to list with max 100 entries per alias
    await this.client.lpush(logKey, logEntry);
    await this.client.ltrim(logKey, 0, 99);

    // Set TTL of 90 days on the log list
    await this.client.expire(logKey, 90 * 24 * 60 * 60);
  }

  /**
   * Get email logs for an alias
   */
  public async getEmailLogs(aliasHash: string, limit: number = 50): Promise<EmailLog[]> {
    const logKey = `logs:${aliasHash}`;
    const logs = await this.client.lrange(logKey, 0, limit - 1);

    return logs.map(log => JSON.parse(log));
  }

  /**
   * Restore sessions from backup
   */
  public async importBackup(backupJson: string): Promise<number> {
    const backup = JSON.parse(backupJson);
    let restored = 0;

    for (const session of backup.sessions) {
      const sessionKey = `session:${session.sessionToken}`;
      const aliasKey = `alias:${session.aliasHash}`;

      // Calculate remaining TTL
      let ttl = 90 * 24 * 60 * 60; // Default 90 days
      if (session.expiresAt) {
        const remaining = Math.floor((session.expiresAt - Date.now()) / 1000);
        if (remaining > 0) {
          ttl = remaining;
        }
      }

      await this.client.setex(sessionKey, ttl, JSON.stringify(session));
      await this.client.setex(aliasKey, ttl, session.sessionToken);
      restored++;
    }

    console.log(`✅ Restored ${restored} sessions from backup`);
    return restored;
  }
}

// Singleton instance (lazy-loaded)
let redisAnonymousStoreInstance: RedisAnonymousStore | null = null;

export const getRedisAnonymousStore = async (): Promise<RedisAnonymousStore> => {
  if (!redisAnonymousStoreInstance) {
    redisAnonymousStoreInstance = RedisAnonymousStore.getInstance();
    await redisAnonymousStoreInstance.connect();
  }
  return redisAnonymousStoreInstance;
};
