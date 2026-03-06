import pool from '../database/connection';
import { User, AuthResponse } from '../types';
import { generateToken } from '../auth/jwt';
import { v4 as uuidv4 } from 'uuid';

export class UserService {
  async findOrCreateUser(googleId: string, email: string): Promise<User> {
    const client = await pool.connect();
    
    try {
      const existingUser = await client.query(
        'SELECT * FROM users WHERE google_id = $1',
        [googleId]
      );

      if (existingUser.rows.length > 0) {
        const row = existingUser.rows[0];
        return {
          id: row.id,
          email: row.email,
          googleId: row.google_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }

      const newUser = await client.query(
        'INSERT INTO users (id, email, google_id) VALUES ($1, $2, $3) RETURNING *',
        [uuidv4(), email, googleId]
      );

      const row = newUser.rows[0];
      return {
        id: row.id,
        email: row.email,
        googleId: row.google_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } finally {
      client.release();
    }
  }

  async authenticateWithGoogle(googleId: string, email: string): Promise<AuthResponse> {
    const user = await this.findOrCreateUser(googleId, email);
    const token = generateToken(user);

    return { token, user };
  }

  async getUserById(id: string): Promise<User | null> {
    const client = await pool.connect();

    try {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        googleId: row.google_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } finally {
      client.release();
    }
  }

  async getUserByClerkId(clerkId: string): Promise<User | null> {
    const client = await pool.connect();

    try {
      const result = await client.query('SELECT * FROM users WHERE google_id = $1', [clerkId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        googleId: row.google_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } finally {
      client.release();
    }
  }

  async createUserFromClerk(clerkId: string, email: string): Promise<User> {
    const client = await pool.connect();

    try {
      const newUser = await client.query(
        'INSERT INTO users (id, email, google_id) VALUES ($1, $2, $3) RETURNING *',
        [uuidv4(), email, clerkId]
      );

      const row = newUser.rows[0];
      return {
        id: row.id,
        email: row.email,
        googleId: row.google_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } finally {
      client.release();
    }
  }
}