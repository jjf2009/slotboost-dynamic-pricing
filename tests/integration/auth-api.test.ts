import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { POST as registerPost } from "@/app/api/register/route";
import { POST as loginPost } from "@/app/api/login/route";
import { GET as meGet } from "@/app/api/auth/me/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";
import { uniqueEmail, signTestToken } from "../helpers/auth";
import {
  cleanupTrackedRecords,
  disconnectTestPrisma,
  hasDatabase,
  testTracker,
} from "../helpers/db";

const dbAvailable = hasDatabase();

vi.mock("next/headers", () => {
  let tokenValue: string | undefined;
  return {
    cookies: vi.fn(async () => ({
      get: (name: string) =>
        name === "token" && tokenValue ? { value: tokenValue } : undefined,
      getAll: () => [],
      set: vi.fn((_name: string, value: string) => {
        tokenValue = value;
      }),
    })),
    __setToken: (t: string | undefined) => {
      tokenValue = t;
    },
  };
});

async function setMockToken(token: string | undefined) {
  const headers = await import("next/headers");
  // @ts-expect-error test helper from mock
  headers.__setToken(token);
}

describe("Auth API", () => {
  afterAll(async () => {
    if (dbAvailable) {
      await cleanupTrackedRecords();
      await disconnectTestPrisma();
    }
  });

  describe("POST /api/register validation", () => {
    it("returns 400 for invalid email", async () => {
      const req = new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Bad",
          email: "not-an-email",
          password: "password123",
          role: "client",
        }),
      });
      const res = await registerPost(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for short password", async () => {
      const req = new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: uniqueEmail("short-pw"),
          password: "short",
          role: "client",
        }),
      });
      const res = await registerPost(req);
      expect(res.status).toBe(400);
    });
  });

  describe.skipIf(!dbAvailable)("POST /api/register + login + me + logout", () => {
    const password = "testpass123";
    let proEmail: string;
    let proUserId: string;
    let registerStatus: number;
    let registerSetCookie: string | null;

    beforeAll(async () => {
      proEmail = uniqueEmail("pro");
      const req = new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Pro",
          email: proEmail,
          password,
          role: "professional",
          serviceType: "Tutor",
        }),
      });
      const res = await registerPost(req);
      registerStatus = res.status;
      registerSetCookie = res.headers.get("set-cookie");
      const body = await res.json();
      proUserId = body.user.id;
      testTracker.userIds.push(proUserId);
    }, 60_000);

    it("registers a professional and sets cookie", () => {
      expect(registerStatus).toBe(201);
      expect(registerSetCookie).toMatch(/token=/);
    });

    it("GET /api/auth/me returns 401 without cookie", async () => {
      await setMockToken(undefined);
      const res = await meGet();
      expect(res.status).toBe(401);
    });

    it("GET /api/auth/me returns user with valid cookie", async () => {
      await setMockToken(
        signTestToken({
          userId: proUserId,
          email: proEmail,
          role: "professional",
        }),
      );

      const res = await meGet();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.email).toBe(proEmail);
      expect(body.role).toBe("professional");
    });

    it("POST /api/login rejects bad password", async () => {
      const req = new Request("http://localhost/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: proEmail, password: "wrongpass99" }),
      });
      const res = await loginPost(req);
      expect(res.status).toBe(409);
    });

    it("POST /api/auth/logout clears cookie", async () => {
      const res = await logoutPost();
      expect(res.status).toBe(200);
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toMatch(/Max-Age=0/);
    });
  });
});