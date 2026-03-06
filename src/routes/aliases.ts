import express from 'express';
import { getAuth } from '@clerk/express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { AliasService } from '../services/aliasService';
import { UserService } from '../services/userService';
import { clerkClient } from '@clerk/express';

const router = express.Router();
const aliasService = new AliasService();
const userService = new UserService();

router.use(authenticateToken);

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { description } = req.body;
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await userService.getUserByClerkId(userId);
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(userId);
      if (!clerkUser || !clerkUser.primaryEmailAddress) {
        return res.status(404).json({ error: 'User not found' });
      }
      const newUser = await userService.createUserFromClerk(userId, clerkUser.primaryEmailAddress.emailAddress);
      const alias = await aliasService.createAlias(newUser.id, newUser.email, description);
      return res.status(201).json({
        alias: {
          ...alias,
          fullAddress: `${alias.localPart}@${alias.domain}`,
        },
      });
    }

    const alias = await aliasService.createAlias(user.id, user.email, description);

    res.status(201).json({
      alias: {
        ...alias,
        fullAddress: `${alias.localPart}@${alias.domain}`,
      },
    });
  } catch (error) {
    console.error('Create alias error:', error);
    res.status(500).json({ error: 'Failed to create alias' });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await userService.getUserByClerkId(userId);
    if (!user) {
      return res.json({ aliases: [] });
    }

    const aliases = await aliasService.getUserAliases(user.id);

    const aliasesWithFullAddress = aliases.map(alias => ({
      ...alias,
      fullAddress: `${alias.localPart}@${alias.domain}`,
    }));

    res.json({ aliases: aliasesWithFullAddress });
  } catch (error) {
    console.error('Get aliases error:', error);
    res.status(500).json({ error: 'Failed to retrieve aliases' });
  }
});

router.patch('/:aliasId/status', async (req: AuthRequest, res) => {
  try {
    const { aliasId } = req.params;
    const { status } = req.body;
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!['active', 'inactive', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await userService.getUserByClerkId(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const aliases = await aliasService.getUserAliases(user.id);
    const alias = aliases.find(a => a.id === aliasId);

    if (!alias) {
      return res.status(404).json({ error: 'Alias not found' });
    }

    await aliasService.updateAliasStatus(aliasId, status);
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Update alias status error:', error);
    res.status(500).json({ error: 'Failed to update alias status' });
  }
});

router.delete('/:aliasId', async (req: AuthRequest, res) => {
  try {
    const { aliasId } = req.params;
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await userService.getUserByClerkId(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const deleted = await aliasService.deleteAlias(aliasId, user.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Alias not found' });
    }

    res.json({ message: 'Alias deleted successfully' });
  } catch (error) {
    console.error('Delete alias error:', error);
    res.status(500).json({ error: 'Failed to delete alias' });
  }
});

export default router;