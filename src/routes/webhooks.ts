import express from 'express';
import { EmailService } from '../services/emailService';

const router = express.Router();
const emailService = new EmailService();

router.post('/inbound', express.raw({ type: 'application/json', limit: '10mb' }), async (req, res) => {
  try {
    console.log('Received inbound email webhook');
    
    let emailData;
    
    if (req.headers['content-type']?.includes('application/json')) {
      const body = JSON.parse(req.body.toString());
      emailData = body.rawEmail || body.email || body.data;
    } else {
      emailData = req.body.toString();
    }

    if (!emailData) {
      return res.status(400).json({ error: 'No email data provided' });
    }

    await emailService.processIncomingEmail(emailData);
    
    res.status(200).json({ status: 'processed' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Failed to process email' });
  }
});

router.post('/ses', express.raw({ type: 'application/json', limit: '10mb' }), async (req, res) => {
  try {
    console.log('Received AWS SES webhook');
    
    const message = JSON.parse(req.body.toString());
    
    if (message.Type === 'SubscriptionConfirmation') {
      console.log('SES subscription confirmation:', message.SubscribeURL);
      return res.status(200).json({ status: 'subscription_confirmed' });
    }

    if (message.Type === 'Notification') {
      const sesMessage = JSON.parse(message.Message);
      
      if (sesMessage.eventType === 'bounce' || sesMessage.eventType === 'complaint') {
        console.log('SES bounce/complaint notification:', sesMessage);
        return res.status(200).json({ status: 'notification_processed' });
      }

      if (sesMessage.mail && sesMessage.mail.commonHeaders) {
        const rawEmail = sesMessage.content || sesMessage.mail.source;
        if (rawEmail) {
          await emailService.processIncomingEmail(rawEmail);
        }
      }
    }

    res.status(200).json({ status: 'processed' });
  } catch (error) {
    console.error('SES webhook processing error:', error);
    res.status(500).json({ error: 'Failed to process SES webhook' });
  }
});

router.post('/mailgun', express.raw({ type: 'application/x-www-form-urlencoded', limit: '25mb' }), async (req, res) => {
  try {
    console.log('Received Mailgun webhook');
    
    const formData = new URLSearchParams(req.body.toString());
    const bodyPlain = formData.get('body-plain');
    const bodyHtml = formData.get('body-html');
    const subject = formData.get('subject');
    const from = formData.get('from');
    const to = formData.get('recipient');

    if (!to) {
      return res.status(400).json({ error: 'No recipient provided' });
    }

    const mockEmail = `From: ${from}
To: ${to}
Subject: ${subject}

${bodyPlain || bodyHtml}`;

    await emailService.processIncomingEmail(mockEmail);
    
    res.status(200).json({ status: 'processed' });
  } catch (error) {
    console.error('Mailgun webhook processing error:', error);
    res.status(500).json({ error: 'Failed to process Mailgun webhook' });
  }
});

export default router;