import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_development";
const secret = new TextEncoder().encode(JWT_SECRET);

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as {
      userId: string;
      email: string;
      role: string;
    };
  } catch (error) {
    console.error("JWT Verification failed:", error);
    return null;
  }
}