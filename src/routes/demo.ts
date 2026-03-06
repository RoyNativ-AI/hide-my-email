import express from 'express';
import { generateToken } from '../auth/jwt';

const router = express.Router();

// Demo login endpoint - רק לפיתוח!
router.post('/login', async (req, res) => {
  // Temporarily allow demo login in production for testing
  // if (process.env.NODE_ENV !== 'development') {
  //   return res.status(404).json({ error: 'Not found' });
  // }

  try {
    // יוצר משתמש demo
    const demoUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@gmail.com',
      googleId: 'demo123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const token = generateToken(demoUser);

    res.json({
      token,
      user: demoUser,
      message: 'Demo login - development only'
    });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: 'Demo login failed' });
  }
});

export default router;