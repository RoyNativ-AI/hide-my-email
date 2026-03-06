/**
 * Email Forwarding Route
 * Receives email from Cloudflare Worker and forwards it using Resend
 */

import express from 'express';
import { EmailForwardingService } from '../services/emailForwardingService';

const router = express.Router();
const emailService = new EmailForwardingService();

/**
 * Forward email endpoint
 * Called by Cloudflare Worker after looking up the alias
 */
router.post('/', async (req, res) => {
  try {
    // Verify API key
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.WORKER_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { from, to, recipient, subject, text, html, rawEmail } = req.body;

    // Validate required fields
    if (!from || !to || !recipient) {
      return res.status(400).json({
        error: 'Missing required fields: from, to, recipient'
      });
    }

    console.log(`📨 Forward request: ${from} → ${to} → ${recipient}`);

    // Forward the email
    const result = await emailService.forwardEmail({
      from,
      to,
      recipient,
      subject: subject || 'Forwarded Email',
      text,
      html,
      rawEmail,
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to forward email',
        details: result.error,
      });
    }

    res.json({
      success: true,
      messageId: result.messageId,
    });

  } catch (error: any) {
    console.error('Forward email error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

export default router;
