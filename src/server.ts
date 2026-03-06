import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { clerkMiddleware } from '@clerk/express';

import authRoutes from './routes/auth';
import aliasRoutes from './routes/aliases-memory'; // No database required!
import anonymousRoutes from './routes/aliases-anonymous'; // Zero-Knowledge mode
import webhookRoutes from './routes/webhooks';
import logRoutes from './routes/logs';
import demoRoutes from './routes/demo';
import forwardRoutes from './routes/forward'; // Email forwarding via Resend

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4887;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://*.clerk.accounts.dev", "https://*.clerk.com", "https://clerk.maili2u.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "https://*.clerk.accounts.dev", "https://*.clerk.com", "https://clerk.maili2u.com", "https://img.clerk.com"],
      connectSrc: ["'self'", "https://*.clerk.accounts.dev", "https://*.clerk.com", "https://clerk.maili2u.com"],
      frameSrc: ["https://*.clerk.accounts.dev", "https://*.clerk.com", "https://clerk.maili2u.com"],
      workerSrc: ["'self'", "blob:"],
    },
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));

app.use(clerkMiddleware());

app.use('/api/webhooks', webhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/aliases', aliasRoutes);
app.use('/api/anonymous', anonymousRoutes); // Zero-Knowledge API (no auth!)
app.use('/api/logs', logRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/forward', forwardRoutes); // Email forwarding endpoint

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api', (req, res) => {
  res.json({ 
    message: 'Email Alias Service API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      aliases: '/api/aliases',
      webhooks: '/api/webhooks',
      health: '/health'
    }
  });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`Alias Domain: ${process.env.ALIAS_DOMAIN}`);
});

export default app;