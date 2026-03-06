import express from 'express';
import { getAuth } from '@clerk/express';
import { UserService } from '../services/userService';
import { clerkClient } from '@clerk/express';

const router = express.Router();
const userService = new UserService();

router.get('/me', async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const clerkUser = await clerkClient.users.getUser(userId);

    if (!clerkUser || !clerkUser.primaryEmailAddress) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await userService.getUserByClerkId(userId);

    if (!user) {
      const newUser = await userService.createUserFromClerk(
        userId,
        clerkUser.primaryEmailAddress.emailAddress
      );
      return res.json({ user: newUser });
    }

    res.json({ user });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;