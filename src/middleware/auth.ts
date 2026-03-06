import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '@clerk/express';

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
  };
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticateToken = requireAuth({
  signInUrl: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/sign-in` : 'http://localhost:3001/sign-in',
});