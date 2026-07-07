import jwt from "jsonwebtoken";

export type AuthPayload = {
  userId: string;
  email: string;
  role: "professional" | "client";
};

export function signTestToken(payload: AuthPayload): string {
  const secret = process.env.JWT_SECRET || "fallback_secret_for_development";
  return jwt.sign(payload, secret, { expiresIn: "1h" });
}

export function authCookieHeader(payload: AuthPayload): string {
  return `token=${signTestToken(payload)}`;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@slotboost.test`;
}