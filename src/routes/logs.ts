import express from 'express';
import { getAuth } from '@clerk/express';
import { memoryStore, EncryptedAlias } from '../database/memoryStore';
import { getRedisAnonymousStore } from '../database/redisAnonymousStore';
import crypto from 'crypto';

const router = express.Router();

/**
 * Hash function for user ID
 */
function hashUserId(userId: string): string {
  return crypto.createHash('sha256').update(userId).digest('hex');
}

/**
 * Hash function for alias address
 */
function hashAliasAddress(aliasAddress: string): string {
  return crypto.createHash('sha256').update(aliasAddress.toLowerCase()).digest('hex');
}

/**
 * Get email logs for a specific alias
 */
router.get('/alias/:aliasId', async (req, res) => {
  try {
    const { aliasId } = req.params;
    const auth = getAuth(req);
    const { userId } = auth;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user's aliases from memory store
    const userHash = hashUserId(userId);
    const userAliases = memoryStore.getAliasesByUserHash(userHash);
    const alias = userAliases.find((a: EncryptedAlias) => a.id === aliasId);

    if (!alias) {
      return res.status(404).json({ error: 'Alias not found' });
    }

    // Get the alias address from encrypted blob
    const aliasData = JSON.parse(alias.encryptedBlob);
    const aliasAddress = `${aliasData.localPart}@${aliasData.domain}`;
    const aliasHash = hashAliasAddress(aliasAddress);

    // Get logs from Redis
    const store = await getRedisAnonymousStore();
    const logs = await store.getEmailLogs(aliasHash, 50);

    // Format logs for response (hide sensitive data)
    const formattedLogs = logs.map(log => ({
      id: log.id,
      direction: log.direction,
      from: maskEmail(log.from),
      to: maskEmail(log.to),
      subject: log.subject,
      bodyPreview: log.bodyPreview,
      status: log.status,
      timestamp: log.timestamp,
      error: log.error,
    }));

    res.json({ logs: formattedLogs });
  } catch (error) {
    console.error('Get email logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve email logs' });
  }
});

/**
 * Get all email logs for the current user
 */
router.get('/', async (req, res) => {
  try {
    const auth = getAuth(req);
    const { userId } = auth;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userHash = hashUserId(userId);
    const userAliases = memoryStore.getAliasesByUserHash(userHash);

    if (!userAliases.length) {
      return res.json({ logs: [] });
    }

    const store = await getRedisAnonymousStore();
    const allLogs: any[] = [];

    for (const alias of userAliases) {
      const aliasData = JSON.parse(alias.encryptedBlob);
      const aliasAddress = `${aliasData.localPart}@${aliasData.domain}`;
      const aliasHash = hashAliasAddress(aliasAddress);

      const logs = await store.getEmailLogs(aliasHash, 20);

      for (const log of logs) {
        allLogs.push({
          id: log.id,
          aliasId: alias.id,
          alias: aliasAddress,
          direction: log.direction,
          from: maskEmail(log.from),
          to: maskEmail(log.to),
          subject: log.subject,
          status: log.status,
          timestamp: log.timestamp,
        });
      }
    }

    // Sort by timestamp descending
    allLogs.sort((a, b) => b.timestamp - a.timestamp);

    res.json({ logs: allLogs.slice(0, 100) });
  } catch (error) {
    console.error('Get all logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve email logs' });
  }
});

/**
 * Mask email for privacy (show first 2 chars + domain)
 */
function maskEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;

  const maskedLocal = local.length > 2
    ? local.substring(0, 2) + '***'
    : local + '***';

  return `${maskedLocal}@${domain}`;
}

export default router;
