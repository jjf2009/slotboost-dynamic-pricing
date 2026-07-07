import { APIRequestContext, type Playwright } from "@playwright/test";

const PASSWORD = "testpass123";

export function testEmail(prefix: string): string {
  return `e2e-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@slotboost.test`;
}

function formatLocalSlotDateTime(hoursFromNow: number) {
  const start = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
  };
}

export async function registerViaApi(
  request: APIRequestContext,
  role: "professional" | "client",
  prefix: string,
) {
  const email = testEmail(prefix);
  const body: Record<string, string> = {
    name: `E2E ${prefix}`,
    email,
    password: PASSWORD,
    phone: "9876543210",
    role,
  };
  if (role === "professional") body.serviceType = "Tutor";

  const res = await request.post("/api/register", { data: body });
  if (!res.ok()) {
    throw new Error(`register failed ${res.status()}: ${await res.text()}`);
  }
  const json = await res.json();
  return { email, userId: json.user.id as string, role };
}

export async function createSlotViaApi(
  request: APIRequestContext,
  hoursFromNow = 6,
) {
  const { date, time } = formatLocalSlotDateTime(hoursFromNow);

  const res = await request.post("/api/slots", {
    data: { date, time, duration: 60, demandIndex: 0.3 },
  });
  if (!res.ok()) {
    throw new Error(`createSlot failed ${res.status()}: ${await res.text()}`);
  }
  const slot = await res.json();
  return slot.id as string;
}

export async function createProfessionalWithSlot(
  playwright: Playwright,
  prefix: string,
  hoursFromNow = 8,
) {
  const proContext = await playwright.request.newContext();
  try {
    await registerViaApi(proContext, "professional", prefix);
    return await createSlotViaApi(proContext, hoursFromNow);
  } finally {
    await proContext.dispose();
  }
}

export async function bookSlotViaApi(
  request: APIRequestContext,
  slotId: string,
  email: string,
  name = "E2E Client",
) {
  return request.post("/api/slots/book", {
    data: { slotId, email, name, phone: "9876543210" },
  });
}

export const e2eRequiresDb = !!process.env.DATABASE_URL;