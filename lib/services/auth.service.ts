import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/user.model";
import { prisma } from "../db";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: "professional" | "client";
  serviceType?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  static async registerUser(input: RegisterInput) {
    const { name, email, password, phone, role, serviceType } = input;

    // Enforce unique constraint
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) throw new Error("USER_ALREADY_EXISTS");

    // NFR-03: bcrypt with 12 salt rounds
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user with role persisted directly
    const newUser = await prisma.user.create({
      data: { name, email, password_hash: passwordHash, role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      },
    });

    // Create role-specific profile
    if (role === "professional") {
      await prisma.professional.create({
        data: {
          userId: newUser.id,
          name,
          email,
          phone: phone ?? null,
          service_type: serviceType ?? null,
          base_price: 500,
          d_max: 0.4,
        },
      });
    } else {
      // Client: link userId so they can authenticate with their profile
      await prisma.client.create({
        data: {
          userId: newUser.id,
          name,
          email,
          phone: phone ?? null,
        },
      });
    }

    const jwtSecret =
      process.env.JWT_SECRET || "fallback_secret_for_development";
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role },
      jwtSecret,
      { expiresIn: "50d" },
    );

    return { user: newUser, token };
  }

  static async loginUser(input: LoginInput) {
    const { email, password } = input;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("INVALID_CREDENTIALS");

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) throw new Error("INVALID_CREDENTIALS");

    const jwtSecret =
      process.env.JWT_SECRET || "fallback_secret_for_development";

    // Role is now stored on the user row — no extra query needed
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: "50d" },
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token };
  }
}
