import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model';

// Input DTO matching our Zod schema
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email:string,
  password:string
}

export class AuthService {
  static async registerUser(input: RegisterInput) {
    const { name, email, password } = input;

    // 1. Business Logic: Enforce unique constraint
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      // Throw an error safely for the controller to catch
      throw new Error('USER_ALREADY_EXISTS');
    }

    // 2. Business Logic: Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 3. Command Model to persist data
    const newUser = await UserModel.create(name, email, passwordHash);

    // 4. Generate JWT Token
    // In production, ensure process.env.JWT_SECRET is set securely.
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_development';
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      jwtSecret,
      { expiresIn: '50d' } // Token expires in 50 days
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
