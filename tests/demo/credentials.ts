/** Fixed demo accounts for college presentation (Twilio sandbox phone). */

export const DEMO_PHONE = "8421012788";
export const DEMO_PASSWORD = "DemoPass123";

export const DEMO = {
  pro: {
    email: "demo.pro@slotboost.test",
    name: "Demo Professional",
    serviceType: "Tutor",
    basePrice: 1000,
    dMax: 0.4,
  },
  clientA: {
    email: "demo.client.a@slotboost.test",
    name: "Demo Client A",
  },
  clientB: {
    email: "demo.client.b@slotboost.test",
    name: "Demo Client B",
  },
} as const;

/** Hours from now for the live demo slot — must be < 4 so cancel recovery activates. */
export const DEMO_SLOT_HOURS_FROM_NOW = 3;
export const DEMO_SLOT_DEMAND_INDEX = 0.2;

export type DemoStep = {
  id: number;
  title: string;
  say: string;
};

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 1,
    title: "Professional login",
    say: "This is the service-provider side — tutors, clinics, freelancers.",
  },
  {
    id: 2,
    title: "Pricing settings",
    say: "Base price ₹1000 and max discount 40% — the floor for dynamic pricing.",
  },
  {
    id: 3,
    title: "Demand heat map",
    say: "Low demand hours get bigger automatic discounts.",
  },
  {
    id: 4,
    title: "Create a near-term slot",
    say: "Slot under 24 hours with low demand — live discounted price appears.",
  },
  {
    id: 5,
    title: "Client A books",
    say: "Client browses, subscribes to flash deals, and books the discounted slot.",
  },
  {
    id: 6,
    title: "Client B joins waitlist",
    say: "When the slot is full, another client joins the waitlist.",
  },
  {
    id: 7,
    title: "Client A cancels",
    say: "Cancellation inside the 4-hour window triggers a 10-minute recovery deal.",
  },
  {
    id: 8,
    title: "Client B rebooks via waitlist",
    say: "Waitlisted client books the recovered slot at the flash cancellation price.",
  },
  {
    id: 9,
    title: "Professional dashboard",
    say: "Back on the pro dashboard — slot booked again with price frozen.",
  },
];

export function printDemoCredentials(extra?: { professionalId?: string; slotId?: string }) {
  console.log("");
  console.log("✅ Demo accounts ready");
  console.log("─────────────────────────────────────────────");
  console.log(`Professional: ${DEMO.pro.email} / ${DEMO_PASSWORD}`);
  console.log(`Client A:     ${DEMO.clientA.email} / ${DEMO_PASSWORD}`);
  console.log(`Client B:     ${DEMO.clientB.email} / ${DEMO_PASSWORD}`);
  console.log(`Phone (all):  ${DEMO_PHONE}  → WhatsApp sandbox`);
  if (extra?.professionalId) {
    console.log(`Pro profile:  ${extra.professionalId}`);
  }
  if (extra?.slotId) {
    console.log(`Starter slot: ${extra.slotId}`);
  }
  console.log("─────────────────────────────────────────────");
  console.log("");
}
