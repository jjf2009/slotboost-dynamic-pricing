# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: concurrency.spec.ts >> Cross-client concurrency >> only one client succeeds when racing the same slot
- Location: tests/e2e/concurrency.spec.ts:13:7

# Error details

```
Error: apiRequestContext.post: read ECONNRESET
Call log:
  - → POST http://localhost:3000/api/register
    - user-agent: Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - content-type: application/json
    - content-length: 172

```

# Test source

```ts
  1  | import { APIRequestContext, type Playwright } from "@playwright/test";
  2  | 
  3  | const PASSWORD = "testpass123";
  4  | 
  5  | export function testEmail(prefix: string): string {
  6  |   return `e2e-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@slotboost.test`;
  7  | }
  8  | 
  9  | function formatLocalSlotDateTime(hoursFromNow: number) {
  10 |   const start = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  11 |   const pad = (n: number) => String(n).padStart(2, "0");
  12 |   return {
  13 |     date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
  14 |     time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
  15 |   };
  16 | }
  17 | 
  18 | export async function registerViaApi(
  19 |   request: APIRequestContext,
  20 |   role: "professional" | "client",
  21 |   prefix: string,
  22 | ) {
  23 |   const email = testEmail(prefix);
  24 |   const body: Record<string, string> = {
  25 |     name: `E2E ${prefix}`,
  26 |     email,
  27 |     password: PASSWORD,
  28 |     phone: "9876543210",
  29 |     role,
  30 |   };
  31 |   if (role === "professional") body.serviceType = "Tutor";
  32 | 
> 33 |   const res = await request.post("/api/register", { data: body });
     |                             ^ Error: apiRequestContext.post: read ECONNRESET
  34 |   if (!res.ok()) {
  35 |     throw new Error(`register failed ${res.status()}: ${await res.text()}`);
  36 |   }
  37 |   const json = await res.json();
  38 |   return { email, userId: json.user.id as string, role };
  39 | }
  40 | 
  41 | export async function createSlotViaApi(
  42 |   request: APIRequestContext,
  43 |   hoursFromNow = 6,
  44 | ) {
  45 |   const { date, time } = formatLocalSlotDateTime(hoursFromNow);
  46 | 
  47 |   const res = await request.post("/api/slots", {
  48 |     data: { date, time, duration: 60, demandIndex: 0.3 },
  49 |   });
  50 |   if (!res.ok()) {
  51 |     throw new Error(`createSlot failed ${res.status()}: ${await res.text()}`);
  52 |   }
  53 |   const slot = await res.json();
  54 |   return slot.id as string;
  55 | }
  56 | 
  57 | export async function createProfessionalWithSlot(
  58 |   playwright: Playwright,
  59 |   prefix: string,
  60 |   hoursFromNow = 8,
  61 | ) {
  62 |   const proContext = await playwright.request.newContext();
  63 |   try {
  64 |     await registerViaApi(proContext, "professional", prefix);
  65 |     return await createSlotViaApi(proContext, hoursFromNow);
  66 |   } finally {
  67 |     await proContext.dispose();
  68 |   }
  69 | }
  70 | 
  71 | export async function bookSlotViaApi(
  72 |   request: APIRequestContext,
  73 |   slotId: string,
  74 |   email: string,
  75 |   name = "E2E Client",
  76 | ) {
  77 |   return request.post("/api/slots/book", {
  78 |     data: { slotId, email, name, phone: "9876543210" },
  79 |   });
  80 | }
  81 | 
  82 | export const e2eRequiresDb = !!process.env.DATABASE_URL;
```