import jwt from 'jsonwebtoken';
import { User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export function generateToken(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token: string): { userId: string; email: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      userId: decoded.userId,
      email: decoded.email,
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
}