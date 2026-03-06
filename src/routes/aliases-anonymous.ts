/**
 * Anonymous Aliases Routes
 * Zero-Knowledge: No user tracking, session-based
 */

import express from 'express';
import { anonymousStore } from '../database/anonymousStore';
import { getRedisAnonymousStore } from '../database/redisAnonymousStore';

const router = express.Router();

// Choose store based on environment
const useRedis = process.env.ANONYMOUS_STORE === 'redis';

async function getStore() {
  if (useRedis) {
    return await getRedisAnonymousStore();
  }
  return anonymousStore;
}

/**
 * Create anonymous alias
 * No auth required! Server doesn't know who you are.
 *
 * Client provides:
 * - aliasHash: hash of alias email (for routing)
 * - encryptedBlob: client-encrypted data
 * - ttlDays: optional expiration (default: 90 days)
 *
 * Returns:
 * - sessionToken: SAVE THIS! It's the only way to access your alias
 */
router.post('/create', async (req, res) => {
  try {
    const { aliasHash, encryptedBlob, ttlDays } = req.body;

    if (!aliasHash || !encryptedBlob) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const store = await getStore();

    // Check if alias already exists
    const existing = await store.getSessionByAliasHash(aliasHash);
    if (existing) {
      return res.status(409).json({ error: 'Alias already exists' });
    }

    // Create session
    const sessionToken = await store.createSession(
      aliasHash,
      encryptedBlob,
      ttlDays || 90
    );

    res.status(201).json({
      sessionToken,
      message: 'SAVE THIS TOKEN! You cannot recover it if lost.',
      storage: useRedis ? 'redis (persistent)' : 'memory (dev only)',
    });
  } catch (error) {
    console.error('Create anonymous alias error:', error);
    res.status(500).json({ error: 'Failed to create alias' });
  }
});

/**
 * Get session data by token
 * Client provides their session token
 */
router.post('/session', async (req, res) => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(400).json({ error: 'Session token required' });
    }

    const store = await getStore();
    const session = await store.getSessionByToken(sessionToken);

    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    res.json({
      sessionToken: session.sessionToken,
      encryptedBlob: session.encryptedBlob,
      status: session.status,
      createdAt: session.createdAt,
      lastUsed: session.lastUsed,
      emailCount: session.emailCount,
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * Get multiple sessions (batch)
 * Client provides array of their session tokens
 */
router.post('/sessions/batch', async (req, res) => {
  try {
    const { sessionTokens } = req.body;

    if (!Array.isArray(sessionTokens)) {
      return res.status(400).json({ error: 'sessionTokens must be an array' });
    }

    const store = await getStore();
    const sessions = await store.getSessionsByTokens(sessionTokens);

    res.json({
      sessions: sessions.map(s => ({
        sessionToken: s.sessionToken,
        encryptedBlob: s.encryptedBlob,
        status: s.status,
        createdAt: s.createdAt,
        lastUsed: s.lastUsed,
        emailCount: s.emailCount,
      })),
    });
  } catch (error) {
    console.error('Get sessions batch error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

/**
 * Update session blob
 * Client can update their encrypted data
 */
router.patch('/session', async (req, res) => {
  try {
    const { sessionToken, encryptedBlob } = req.body;

    if (!sessionToken || !encryptedBlob) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const store = await getStore();
    const success = await store.updateSession(sessionToken, encryptedBlob);

    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session updated successfully' });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

/**
 * Update session status
 */
router.patch('/session/status', async (req, res) => {
  try {
    const { sessionToken, status } = req.body;

    if (!sessionToken || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['active', 'inactive', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const store = await getStore();
    const success = await store.updateSessionStatus(sessionToken, status);

    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Update session status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * Delete session
 * WARNING: This is permanent and cannot be undone!
 */
router.delete('/session', async (req, res) => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(400).json({ error: 'Session token required' });
    }

    const store = await getStore();
    const success = await store.deleteSession(sessionToken);

    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted permanently' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

/**
 * Public stats (no private info)
 */
router.get('/stats', async (req, res) => {
  try {
    const store = await getStore();
    const stats = await store.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * INTERNAL: Email routing endpoint
 * Called when email arrives at an alias
 * Returns encrypted blob for forwarding service to process
 */
router.get('/route/:aliasHash', async (req, res) => {
  try {
    const { aliasHash } = req.params;

    const store = await getStore();
    const session = await store.getSessionByAliasHash(aliasHash);

    if (!session || session.status !== 'active') {
      return res.status(404).json({ error: 'Alias not found or inactive' });
    }

    // Touch session (increment counter)
    await store.touchSession(session.sessionToken);

    // Return encrypted blob
    // External service will decrypt and forward
    res.json({
      encryptedBlob: session.encryptedBlob,
      emailCount: session.emailCount,
    });
  } catch (error) {
    console.error('Route email error:', error);
    res.status(500).json({ error: 'Routing failed' });
  }
});

export default router;
