import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model';
import { prisma } from '../db';

// Input DTO matching our Zod schema
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: "professional" | "client";
  serviceType?: string;
}

export interface LoginInput {
  email:string,
  password:string
}

export class AuthService {
  static async registerUser(input: RegisterInput) {
    const { name, email, password, phone, role, serviceType } = input;

    // 1. Business Logic: Enforce unique constraint
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw new Error('USER_ALREADY_EXISTS');
    }

    // 2. Business Logic: Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 3. Command Model to persist data
    const newUser = await UserModel.create(name, email, passwordHash);

    // 4. Create Profile (Professional or Client)
    if (role === "professional") {
      await prisma.professional.create({
        data: {
          userId: newUser.id,
          name: name,
          base_price: 500, // Default values
          d_max: 0.4,
        }
      });
    } else {
      await prisma.client.create({
        data: {
          name: name,
          email: email,
        }
      });
    }

    // 5. Generate JWT Token
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_development';
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      jwtSecret,
      { expiresIn: '50d' }
    );

    return { user: newUser, token };
  }

static async loginUser(input: LoginInput) {
  const { email, password } = input;

  // 1. Find user by email
  const user = await UserModel.findByEmail(email);

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  // 2. Compare password with bcrypt
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  // 3. Generate JWT
  const jwtSecret = process.env.JWT_SECRET || "fallback_secret_for_development";

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    jwtSecret,
    { expiresIn: "50d" }
  );

const { password_hash, ...safeUser } = user;

return { user: safeUser, token };
}
}
