import { prisma } from '../db';

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
    return prisma.user.findUnique({
      where: { email },
    });
  }

  // Create a new user in the database
  static async create(name: string, email: string, passwordHash: string): Promise<Omit<User, 'password_hash'>> {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash: passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        created_at: true,
      }
    });
    return user;
  }
}
