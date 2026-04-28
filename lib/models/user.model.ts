import { db } from '../db';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export class UserModel {
  // Check if a user exists by email
  static async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, name, email, password_hash, created_at
      FROM users
      WHERE email = $1 LIMIT 1;
    `;
    const result = await db.query(query, [email]);
    return result.rows[0] || null;
  }

  // Create a new user in the database
  static async create(name: string, email: string, passwordHash: string): Promise<Omit<User, 'password_hash'>> {
    const query = `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at;
    `;
    const result = await db.query(query, [name, email, passwordHash]);
    return result.rows[0];
  }
}
