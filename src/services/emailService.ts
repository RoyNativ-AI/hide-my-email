import nodemailer from 'nodemailer';
// @ts-ignore
import { simpleParser } from 'mailparser';
import pool from '../database/connection';
import { AliasService } from './aliasService';
import { v4 as uuidv4 } from 'uuid';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private aliasService: AliasService;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.aliasService = new AliasService();
  }

  async processIncomingEmail(rawEmail: string): Promise<void> {
    try {
      const parsed = await simpleParser(rawEmail);
      
      if (!parsed.to) {
        console.log('No recipient found in email');
        return;
      }

      const toAddresses = Array.isArray(parsed.to) ? parsed.to : [parsed.to];
      
      for (const toAddr of toAddresses) {
        const emailAddr = typeof toAddr === 'string' ? toAddr : toAddr.value?.[0]?.address;
        
        if (!emailAddr) continue;

        const [localPart, domain] = emailAddr.split('@');
        const alias = await this.aliasService.findAlias(localPart, domain);

        if (alias) {
          await this.forwardEmail(parsed, alias.recipient, emailAddr, alias.id);
          await this.aliasService.incrementEmailCount(alias.id);
        }
      }
    } catch (error) {
      console.error('Error processing incoming email:', error);
    }
  }

  private async forwardEmail(
    originalEmail: any,
    recipient: string,
    originalTo: string,
    aliasId: string
  ): Promise<void> {
    const fromAddress = originalEmail.from?.value?.[0]?.address || originalEmail.from?.text || 'unknown';
    
    try {
      await this.transporter.sendMail({
        from: `"Email Alias Service" <noreply@${process.env.ALIAS_DOMAIN}>`,
        to: recipient,
        subject: originalEmail.subject || 'No Subject',
        text: this.addForwardingHeader(originalEmail.text || '', fromAddress, originalTo),
        html: this.addForwardingHeaderHtml(originalEmail.html || '', fromAddress, originalTo),
        replyTo: fromAddress,
      });

      await this.logEmailForward(aliasId, fromAddress, originalTo, originalEmail.subject || '', 'forwarded');
      
      console.log(`Email forwarded from ${fromAddress} to ${recipient} via ${originalTo}`);
    } catch (error) {
      console.error('Error forwarding email:', error);
      await this.logEmailForward(aliasId, fromAddress, originalTo, originalEmail.subject || '', 'failed', (error as Error).message);
    }
  }

  private addForwardingHeader(text: string, from: string, via: string): string {
    const header = `--- Forwarded message ---
From: ${from}
Via: ${via}
---

`;
    return header + text;
  }

  private addForwardingHeaderHtml(html: string, from: string, via: string): string {
    const header = `<div style="background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-left: 4px solid #007cba;">
<strong>Forwarded message</strong><br>
<strong>From:</strong> ${from}<br>
<strong>Via:</strong> ${via}
</div>`;
    
    return header + html;
  }

  private async logEmailForward(
    aliasId: string,
    fromAddress: string,
    toAddress: string,
    subject: string,
    status: 'forwarded' | 'blocked' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query(
        `INSERT INTO email_logs (id, alias_id, from_address, to_address, subject, status, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), aliasId, fromAddress, toAddress, subject, status, errorMessage]
      );
    } catch (error) {
      console.error('Error logging email forward:', error);
    } finally {
      client.release();
    }
  }

  async getEmailLogs(aliasId: string, limit: number = 50): Promise<any[]> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM email_logs WHERE alias_id = $1 ORDER BY forwarded_at DESC LIMIT $2',
        [aliasId, limit]
      );

      return result.rows;
    } finally {
      client.release();
    }
  }
}