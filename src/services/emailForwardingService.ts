/**
 * Email Forwarding Service using Resend
 * Forwards emails received from Cloudflare Worker to the actual recipient
 * Supports bi-directional anonymous replies
 */

import { Resend } from 'resend';
import { memoryStore } from '../database/memoryStore';
import { simpleParser } from 'mailparser';
import { getRedisAnonymousStore, EmailLog } from '../database/redisAnonymousStore';
import crypto from 'crypto';

export interface ForwardEmailRequest {
  from: string;
  to: string;
  recipient: string;
  subject: string;
  text?: string;
  html?: string;
  rawEmail?: string;
}

export class EmailForwardingService {
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    this.resend = new Resend(apiKey);
  }

  /**
   * Forward email with bi-directional anonymous support
   * - If sender = recipient (user replying): forward to last external sender
   * - Otherwise: forward to recipient and save sender for replies
   */
  async forwardEmail(request: ForwardEmailRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const aliasAddress = request.to;
      const fromAddress = `${aliasAddress.split('@')[0]}@${process.env.ALIAS_DOMAIN || 'maili2u.com'}`;

      // Parse the raw email to extract clean content
      let emailSubject = request.subject || 'Forwarded Email';
      let emailHtml = request.html;
      let emailText = request.text;

      if (request.rawEmail) {
        try {
          const parsed = await simpleParser(request.rawEmail);
          emailSubject = parsed.subject || emailSubject;
          emailHtml = parsed.html || parsed.textAsHtml || '';
          emailText = parsed.text || '';
        } catch (parseError) {
          console.error('⚠️  Failed to parse email, using raw content:', parseError);
        }
      }

      // Save/update alias recipient mapping
      memoryStore.setAliasRecipient(aliasAddress, request.recipient);

      // Check if this is a reply from the user
      const lastSender = memoryStore.getLastSender(aliasAddress);
      const isReplyFromUser = request.from.toLowerCase() === request.recipient.toLowerCase();

      let actualRecipient: string;
      let direction: string;

      if (isReplyFromUser && lastSender) {
        // This is a reply from the user → send to last external sender
        actualRecipient = lastSender;
        direction = `Reply: ${request.recipient} → ${aliasAddress} → ${lastSender}`;
      } else {
        // This is a new email from external sender → send to user
        actualRecipient = request.recipient;
        direction = `Forward: ${request.from} → ${aliasAddress} → ${request.recipient}`;

        // Save sender for future replies
        memoryStore.setLastSender(aliasAddress, request.from);
      }

      console.log(`📧 ${direction}`);

      const result = await this.resend.emails.send({
        from: fromAddress,
        to: actualRecipient,
        subject: emailSubject,
        html: emailHtml || emailText || 'No content',
        text: emailText,
        replyTo: fromAddress, // Use alias for anonymous replies
      });

      console.log(`Email forwarded successfully: ${result.data?.id}`);

      // Log to Redis
      await this.logEmail({
        aliasAddress,
        direction: isReplyFromUser ? 'outbound' : 'inbound',
        from: request.from,
        to: actualRecipient,
        subject: emailSubject,
        bodyPreview: this.getBodyPreview(emailText || emailHtml || ''),
        status: 'delivered',
        messageId: result.data?.id,
      });

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error: any) {
      console.error('Failed to forward email:', error);

      // Log failure
      await this.logEmail({
        aliasAddress: request.to,
        direction: 'inbound',
        from: request.from,
        to: request.recipient,
        subject: request.subject || 'Unknown',
        status: 'failed',
        error: error.message,
      });

      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Log email to Redis
   */
  private async logEmail(params: {
    aliasAddress: string;
    direction: 'inbound' | 'outbound';
    from: string;
    to: string;
    subject: string;
    bodyPreview?: string;
    status: 'delivered' | 'failed' | 'pending';
    messageId?: string;
    error?: string;
  }): Promise<void> {
    try {
      const store = await getRedisAnonymousStore();
      const aliasHash = crypto.createHash('sha256')
        .update(params.aliasAddress.toLowerCase())
        .digest('hex');

      const log: EmailLog = {
        id: crypto.randomBytes(16).toString('hex'),
        aliasHash,
        direction: params.direction,
        from: params.from,
        to: params.to,
        subject: params.subject,
        bodyPreview: params.bodyPreview,
        status: params.status,
        messageId: params.messageId,
        error: params.error,
        timestamp: Date.now(),
      };

      await store.addEmailLog(log);
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }

  /**
   * Get a preview of the email body (cleaned and trimmed)
   */
  private getBodyPreview(body: string): string {
    // Strip HTML tags
    let text = body.replace(/<[^>]*>/g, ' ');

    // Remove image placeholders [image: xxx]
    text = text.replace(/\[image:[^\]]*\]/gi, '');

    // Remove URLs
    text = text.replace(/https?:\/\/[^\s]+/gi, '');

    // Remove email addresses (but keep the preview readable)
    text = text.replace(/[\w.-]+@[\w.-]+\.\w+/gi, '');

    // Remove phone numbers
    text = text.replace(/\+?\d[\d\s-]{8,}/g, '');

    // Remove quoted replies (lines starting with >)
    text = text.split('\n')
      .filter(line => !line.trim().startsWith('>'))
      .join('\n');

    // Remove "On ... wrote:" patterns (Gmail quote headers)
    text = text.replace(/On\s+\w+,\s+\w+\s+\d+,\s+\d+\s+at\s+[\d:]+\s*[AP]M\s+.*?\s+wrote:/gi, '');

    // Remove signature indicators
    text = text.replace(/^--\s*$/gm, '');
    text = text.replace(/^_{2,}$/gm, '');

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Limit to 300 characters
    if (text.length > 300) {
      text = text.substring(0, 300) + '...';
    }

    return text || '(No text content)';
  }

  /**
   * Parse raw email content
   */
  parseRawEmail(rawEmail: string): { subject: string; text: string; html?: string } {
    // Simple parser - extracts subject and body
    const lines = rawEmail.split('\n');
    let subject = 'Forwarded Email';
    let inBody = false;
    const bodyLines: string[] = [];

    for (const line of lines) {
      if (line.toLowerCase().startsWith('subject:')) {
        subject = line.substring(8).trim();
      }
      if (inBody) {
        bodyLines.push(line);
      }
      if (line.trim() === '') {
        inBody = true;
      }
    }

    const text = bodyLines.join('\n').trim();

    return { subject, text };
  }
}
