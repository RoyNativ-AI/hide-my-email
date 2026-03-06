/**
 * Aliases Routes - Memory Store Version
 * Zero-Knowledge: No database, everything in encrypted blobs
 */

import express from 'express';
import { getAuth, clerkClient } from '@clerk/express';
import { memoryStore } from '../database/memoryStore';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = express.Router();

/**
 * Hash function for user ID
 */
function hashUserId(userId: string): string {
  return crypto.createHash('sha256').update(userId).digest('hex');
}

/**
 * Generate random alias
 */
function generateAlias(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create new alias
 * Auto-generates alias and stores it
 */
router.post('/', async (req, res) => {
  try {
    console.log('📥 Create alias request received');
    const auth = getAuth(req);
    console.log('🔐 Auth result:', auth);
    const { userId } = auth;

    if (!userId) {
      console.log('❌ No userId found in auth');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log('✅ User authenticated:', userId);

    const { description, recipient } = req.body;

    // Get user's email from Clerk
    let recipientEmail = recipient;
    if (!recipientEmail) {
      const user = await clerkClient.users.getUser(userId);
      recipientEmail = user.primaryEmailAddress?.emailAddress;

      if (!recipientEmail) {
        return res.status(400).json({ error: 'User email not found' });
      }
    }

    console.log('📧 Recipient email:', recipientEmail);

    // Generate random alias
    const localPart = generateAlias();
    const domain = process.env.ALIAS_DOMAIN || 'alias.yourdomain.com';
    const fullAddress = `${localPart}@${domain}`;

    // Create encrypted blob (for now, just JSON - can add encryption later)
    const aliasData = {
      localPart,
      domain,
      recipient: recipientEmail,
      description: description || '',
      createdAt: Date.now(),
    };

    const aliasHash = crypto.createHash('sha256').update(fullAddress).digest('hex');
    const encryptedBlob = JSON.stringify(aliasData); // TODO: Add encryption

    // Create alias in memory
    const alias = {
      id: uuidv4(),
      userHash: hashUserId(userId),
      aliasHash,
      encryptedBlob,
      status: 'active' as const,
      createdAt: Date.now(),
      emailCount: 0,
    };

    memoryStore.createAlias(alias);

    // Return alias data in frontend-expected format
    res.status(201).json({
      alias: {
        id: alias.id,
        localPart,
        domain,
        fullAddress,
        recipient: recipientEmail,
        description: description || '',
        status: alias.status,
        createdAt: alias.createdAt,
        emailCount: alias.emailCount,
      },
    });
  } catch (error) {
    console.error('Create alias error:', error);
    res.status(500).json({ error: 'Failed to create alias' });
  }
});

/**
 * Get user's aliases
 * Returns encrypted blobs - client decrypts
 */
router.get('/', async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userHash = hashUserId(userId);
    const aliases = memoryStore.getAliasesByUserHash(userHash);

    // Decode blobs and return full alias data
    const decodedAliases = aliases.map(a => {
      try {
        const aliasData = JSON.parse(a.encryptedBlob);
        return {
          id: a.id,
          localPart: aliasData.localPart,
          domain: aliasData.domain,
          fullAddress: `${aliasData.localPart}@${aliasData.domain}`,
          recipient: aliasData.recipient,
          description: aliasData.description || '',
          status: a.status,
          createdAt: a.createdAt,
          lastUsed: a.lastUsed,
          emailCount: a.emailCount,
        };
      } catch (error) {
        console.error('Error decoding alias:', error);
        return null;
      }
    }).filter(a => a !== null);

    res.json({
      aliases: decodedAliases,
    });
  } catch (error) {
    console.error('Get aliases error:', error);
    res.status(500).json({ error: 'Failed to retrieve aliases' });
  }
});

/**
 * Update alias status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const userHash = hashUserId(userId);
    const aliases = memoryStore.getAliasesByUserHash(userHash);
    const alias = aliases.find(a => a.id === id);

    if (!alias) {
      return res.status(404).json({ error: 'Alias not found' });
    }

    memoryStore.updateAliasStatus(alias.aliasHash, status);
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Update alias status error:', error);
    res.status(500).json({ error: 'Failed to update alias status' });
  }
});

/**
 * Delete alias
 */
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;
    const userHash = hashUserId(userId);
    const aliases = memoryStore.getAliasesByUserHash(userHash);
    const alias = aliases.find(a => a.id === id);

    if (!alias) {
      return res.status(404).json({ error: 'Alias not found' });
    }

    const deleted = memoryStore.deleteAlias(alias.aliasHash, userHash);

    if (!deleted) {
      return res.status(404).json({ error: 'Alias not found' });
    }

    res.json({ message: 'Alias deleted successfully' });
  } catch (error) {
    console.error('Delete alias error:', error);
    res.status(500).json({ error: 'Failed to delete alias' });
  }
});

/**
 * Lookup alias for email forwarding (used by Cloudflare Worker)
 * Public endpoint but requires API key
 */
router.get('/lookup/:aliasEmail', async (req, res) => {
  try {
    const { aliasEmail } = req.params;
    const apiKey = req.headers['x-api-key'];

    // Verify API key
    if (!apiKey || apiKey !== process.env.WORKER_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse email to get alias hash
    const aliasHash = crypto.createHash('sha256').update(aliasEmail.toLowerCase()).digest('hex');

    // Find alias in memory store
    const alias = memoryStore.getAliasByHash(aliasHash);

    if (!alias) {
      return res.status(404).json({
        error: 'Alias not found',
        forward: false
      });
    }

    // Check if alias is active
    if (alias.status !== 'active') {
      return res.status(200).json({
        forward: false,
        reason: 'Alias is not active'
      });
    }

    // Decode the encrypted blob to get recipient
    const aliasData = JSON.parse(alias.encryptedBlob);

    // Increment email count and update last used
    memoryStore.touchAlias(aliasHash);

    res.json({
      forward: true,
      recipient: aliasData.recipient,
      aliasId: alias.id
    });
  } catch (error) {
    console.error('Lookup alias error:', error);
    res.status(500).json({ error: 'Failed to lookup alias' });
  }
});

/**
 * Get stats (public)
 */
router.get('/stats', (req, res) => {
  const stats = memoryStore.getStats();
  res.json(stats);
});

export default router;
