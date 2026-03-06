/**
 * Anonymous Session-Based Store
 * Zero-Knowledge: No user tracking whatsoever
 *
 * Flow:
 * 1. Client creates alias → Server generates random session token
 * 2. Client stores session token (encrypted in localStorage)
 * 3. Server stores: session_token → encrypted_blob
 * 4. Server NEVER knows who owns what
 * 5. When email arrives, route by alias_hash → decrypt blob → forward
 */

import crypto from 'crypto';

export interface AnonymousSession {
  sessionToken: string;         // Random, unlinkable to user
  aliasHash: string;           // For email routing
  encryptedBlob: string;       // Client-encrypted data
  createdAt: number;
  lastUsed?: number;
  emailCount: number;
  status: 'active' | 'inactive' | 'disabled';
  expiresAt?: number;          // Optional TTL
}

export class AnonymousStore {
  private static instance: AnonymousStore;

  // Storage: sessionToken → session data
  private sessions: Map<string, AnonymousSession> = new Map();

  // Reverse index: aliasHash → sessionToken (for routing)
  private aliasToSession: Map<string, string> = new Map();

  private constructor() {
    console.log('🔒 Anonymous Store initialized (Zero-Knowledge mode)');
  }

  public static getInstance(): AnonymousStore {
    if (!AnonymousStore.instance) {
      AnonymousStore.instance = new AnonymousStore();
    }
    return AnonymousStore.instance;
  }

  /**
   * Generate cryptographically secure session token
   */
  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex'); // 64 characters
  }

  /**
   * Create new anonymous session
   * Returns session token - client must save it!
   */
  public createSession(aliasHash: string, encryptedBlob: string, ttlDays?: number): string {
    const sessionToken = this.generateSessionToken();

    const session: AnonymousSession = {
      sessionToken,
      aliasHash,
      encryptedBlob,
      createdAt: Date.now(),
      emailCount: 0,
      status: 'active',
    };

    // Optional: Set expiration
    if (ttlDays) {
      session.expiresAt = Date.now() + (ttlDays * 24 * 60 * 60 * 1000);
    }

    this.sessions.set(sessionToken, session);
    this.aliasToSession.set(aliasHash, sessionToken);

    console.log(`✅ Session created: ${sessionToken.substring(0, 8)}... (expires: ${ttlDays ? ttlDays + ' days' : 'never'})`);

    return sessionToken;
  }

  /**
   * Get session by token
   * Client provides this token to access their alias
   */
  public getSessionByToken(sessionToken: string): AnonymousSession | null {
    const session = this.sessions.get(sessionToken);

    if (!session) return null;

    // Check expiration
    if (session.expiresAt && session.expiresAt < Date.now()) {
      this.deleteSession(sessionToken);
      return null;
    }

    return session;
  }

  /**
   * Get session by alias hash (for email routing)
   * This is the ONLY way server knows how to route emails
   */
  public getSessionByAliasHash(aliasHash: string): AnonymousSession | null {
    const sessionToken = this.aliasToSession.get(aliasHash);
    if (!sessionToken) return null;

    return this.getSessionByToken(sessionToken);
  }

  /**
   * Update session blob (when client wants to update recipient, etc.)
   * Client must provide session token
   */
  public updateSession(sessionToken: string, encryptedBlob: string): boolean {
    const session = this.getSessionByToken(sessionToken);
    if (!session) return false;

    session.encryptedBlob = encryptedBlob;
    this.sessions.set(sessionToken, session);

    console.log(`📝 Session updated: ${sessionToken.substring(0, 8)}...`);
    return true;
  }

  /**
   * Update session status
   */
  public updateSessionStatus(
    sessionToken: string,
    status: 'active' | 'inactive' | 'disabled'
  ): boolean {
    const session = this.getSessionByToken(sessionToken);
    if (!session) return false;

    session.status = status;
    this.sessions.set(sessionToken, session);

    console.log(`🔄 Session status changed: ${sessionToken.substring(0, 8)}... → ${status}`);
    return true;
  }

  /**
   * Touch session (update last used, increment counter)
   * Called when email is forwarded
   */
  public touchSession(sessionToken: string): void {
    const session = this.getSessionByToken(sessionToken);
    if (!session) return;

    session.lastUsed = Date.now();
    session.emailCount++;
    this.sessions.set(sessionToken, session);
  }

  /**
   * Delete session
   * No recovery possible!
   */
  public deleteSession(sessionToken: string): boolean {
    const session = this.sessions.get(sessionToken);
    if (!session) return false;

    this.aliasToSession.delete(session.aliasHash);
    this.sessions.delete(sessionToken);

    console.log(`🗑️  Session deleted: ${sessionToken.substring(0, 8)}...`);
    return true;
  }

  /**
   * List all session tokens
   * Used by client to fetch their aliases
   * Client provides list of session tokens, server returns data
   */
  public getSessionsByTokens(sessionTokens: string[]): AnonymousSession[] {
    const sessions: AnonymousSession[] = [];

    for (const token of sessionTokens) {
      const session = this.getSessionByToken(token);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Cleanup expired sessions
   * Run this periodically (cron job)
   */
  public cleanupExpired(): number {
    const now = Date.now();
    let deleted = 0;

    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt && session.expiresAt < now) {
        this.deleteSession(token);
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`🧹 Cleaned up ${deleted} expired sessions`);
    }

    return deleted;
  }

  /**
   * Get stats (anonymous - no user tracking)
   */
  public getStats() {
    let totalEmails = 0;
    let activeSessions = 0;

    for (const session of this.sessions.values()) {
      totalEmails += session.emailCount;
      if (session.status === 'active') activeSessions++;
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      totalEmailsForwarded: totalEmails,
    };
  }

  /**
   * Clear all (for testing)
   */
  public clearAll(): void {
    this.sessions.clear();
    this.aliasToSession.clear();
    console.log('⚠️  All sessions cleared');
  }
}

// Export singleton
export const anonymousStore = AnonymousStore.getInstance();

/**
 * Usage Example:
 *
 * CLIENT-SIDE:
 * ------------
 * // Create alias
 * const alias = 'x7k9@hide.email';
 * const recipient = 'user@gmail.com';
 * const blob = await zk.encrypt(JSON.stringify({ alias, recipient }));
 * const aliasHash = await zk.hash(alias);
 *
 * // Send to server
 * const { sessionToken } = await api.post('/aliases/anonymous', {
 *   aliasHash,
 *   encryptedBlob: blob
 * });
 *
 * // IMPORTANT: Save session token in localStorage
 * const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
 * sessions.push(sessionToken);
 * localStorage.setItem('sessions', JSON.stringify(sessions));
 *
 * // Later: Get all aliases
 * const tokens = JSON.parse(localStorage.getItem('sessions') || '[]');
 * const { sessions } = await api.post('/aliases/anonymous/batch', { tokens });
 *
 * // Server returns encrypted blobs, client decrypts
 * const aliases = sessions.map(s => {
 *   const decrypted = await zk.decrypt(s.encryptedBlob);
 *   return JSON.parse(decrypted);
 * });
 *
 * SERVER-SIDE:
 * -----------
 * // When email arrives at x7k9@hide.email
 * const aliasHash = hash('x7k9@hide.email');
 * const session = anonymousStore.getSessionByAliasHash(aliasHash);
 *
 * if (session && session.status === 'active') {
 *   // Server can't decrypt! Just forward the encrypted blob info
 *   // In practice, client would have set up forwarding instructions
 *   // Or use a separate encrypted forwarding rule
 *   anonymousStore.touchSession(session.sessionToken);
 * }
 */
