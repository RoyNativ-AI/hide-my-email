import pool from '../database/connection';
import { Alias } from '../types';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class AliasService {
  private generateRandomString(length: number = 8): string {
    return crypto.randomBytes(length).toString('hex').substring(0, length);
  }

  async createAlias(userId: string, recipient: string, description?: string): Promise<Alias> {
    const client = await pool.connect();
    const domain = process.env.ALIAS_DOMAIN || 'alias.localhost';
    
    try {
      let localPart: string;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        localPart = this.generateRandomString(8);
        
        const existing = await client.query(
          'SELECT id FROM aliases WHERE local_part = $1 AND domain = $2',
          [localPart, domain]
        );
        
        if (existing.rows.length === 0) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error('Unable to generate unique alias');
      }

      const result = await client.query(
        `INSERT INTO aliases (id, user_id, local_part, domain, recipient, description) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [uuidv4(), userId, localPart!, domain, recipient, description]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        localPart: row.local_part,
        domain: row.domain,
        recipient: row.recipient,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastUsed: row.last_used,
        emailCount: row.email_count,
      };
    } finally {
      client.release();
    }
  }

  async getUserAliases(userId: string): Promise<Alias[]> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM aliases WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        localPart: row.local_part,
        domain: row.domain,
        recipient: row.recipient,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastUsed: row.last_used,
        emailCount: row.email_count,
      }));
    } finally {
      client.release();
    }
  }

  async findAlias(localPart: string, domain: string): Promise<Alias | null> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM aliases WHERE local_part = $1 AND domain = $2 AND status = $3',
        [localPart, domain, 'active']
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        localPart: row.local_part,
        domain: row.domain,
        recipient: row.recipient,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastUsed: row.last_used,
        emailCount: row.email_count,
      };
    } finally {
      client.release();
    }
  }

  async updateAliasStatus(aliasId: string, status: 'active' | 'inactive' | 'disabled'): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query(
        'UPDATE aliases SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, aliasId]
      );
    } finally {
      client.release();
    }
  }

  async incrementEmailCount(aliasId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query(
        'UPDATE aliases SET email_count = email_count + 1, last_used = CURRENT_TIMESTAMP WHERE id = $1',
        [aliasId]
      );
    } finally {
      client.release();
    }
  }

  async deleteAlias(aliasId: string, userId: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM aliases WHERE id = $1 AND user_id = $2',
        [aliasId, userId]
      );
      
      return result.rowCount ? result.rowCount > 0 : false;
    } finally {
      client.release();
    }
  }
}