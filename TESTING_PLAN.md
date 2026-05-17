# SlotBoost Testing Plan

**Reference:** SRS v1.0 | **Phase:** MVP Validation & Testing

As all MVP features are completely implemented, this document outlines the testing strategy for SlotBoost to ensure the system is reliable, ACID-compliant, and fully operational before any final delivery. The testing will be carried out in three distinct phases: Unit Tests, Module Level Tests, and Full Working Project Tests (E2E).

---

## 🧪 Phase 1: Unit Tests
**Focus:** Pure functions, utility methods, and isolated business logic.
**Tools:** Jest, React Testing Library (if frontend logic is tested)

| Component | Target | Test Cases |
|-----------|--------|------------|
| **Pricing Engine** | `lib/pricing.ts` | - Test `calculatePrice` with extreme negative bounds (max discounts).<br>- Test with positive bounds (no discounts).<br>- Ensure `D_total` correctly caps at `D_max`.<br>- Verify `D_cancel` properly activates within the recovery window.<br>- Test `D_lead` time-based drop thresholds. |
| **Authentication** | `lib/auth.ts` | - Verify JWT token generation and parsing.<br>- Ensure bcrypt hashing matches for valid passwords and rejects invalid ones. |
| **Geo Check** | `app/api/geo/check/route.ts` | - Mock OSRM/Nominatim responses and ensure travel time is calculated correctly.<br>- Test timeout and error fallbacks. |
| **Notifications** | `lib/twilio.ts` (or equivalent) | - Mock Twilio API and ensure proper payload construction for SMS and WhatsApp templates. |

---

## 🔗 Phase 2: Module Level (Integration) Tests
**Focus:** Database transactions, API routing, and multi-step module logic.
**Tools:** Jest, Supertest (for API routes), Prisma Test Client

| Module | Target | Test Cases |
|--------|--------|------------|
| **Slot Booking API** | `POST /api/slots/book` | - **Double-booking prevention:** Simulate 2 simultaneous requests for the same slot; ensure Prisma `$transaction` rolls one back.<br>- Ensure CurrentPrice is correctly calculated at the exact moment of booking.<br>- Ensure geo-check is properly invoked for mobile professionals. |
| **Pricing Recalculation** | `GET /api/pricing/recalculate` | - Run module on simulated slots at various time remaining marks (e.g., 24h, 2h).<br>- Ensure flash-deal notification triggers only on the *first* threshold drop. |
| **Waitlist Autopilot** | `POST /api/slots/cancel` | - Cancel a slot within the 4h window.<br>- Ensure `d_cancel_active` becomes true, and 10-minute expiry is set.<br>- Ensure waitlist notifications are immediately dispatched. |
| **Waitlist Booking** | `POST /api/slots/book` (Waitlist context) | - Attempt to book a waitlist slot at 9 minutes (should succeed).<br>- Attempt to book at 11 minutes (should fail / offer expired). |

---

## 🌍 Phase 3: Full Working Project Tests (End-to-End)
**Focus:** Complete user journeys mirroring real-world usage.
**Tools:** Playwright (for automated E2E), Manual Testing

### Scenario 1: The Golden Booking Flow
1. **Professional Action:** Register a new account, configure the Heat Map, and create an available slot for tomorrow.
2. **Client Action:** Register, browse available slots, and opt-in to flash deal notifications.
3. **System Action:** Simulate time passing to < 24 hours. Cron triggers pricing recalculation.
4. **Verification:** System successfully sends a Twilio SMS to the client.
5. **Client Action:** Client clicks the link in the SMS, views the dynamically discounted price, and successfully books the slot.
6. **Verification:** Both Professional and Client receive confirmation SMS.

### Scenario 2: Waitlist Autopilot & Cancellation Recovery
1. **Setup:** Slot is booked by Client A. Client B joins the waitlist.
2. **Action:** Client A cancels the booking 3 hours before the start time.
3. **System Action:** System detects cancellation within the 4-hour recovery window, activates `D_cancel` (15% additional discount), and sends an urgent WhatsApp/SMS to Client B.
4. **Action:** Client B clicks the link within 10 minutes and books.
5. **Verification:** Client B gets the slot at the recovery price. The slot is marked as booked, and `D_cancel` is removed.

### Scenario 3: Geo-Blocking for Mobile Professionals
1. **Setup:** Mobile Professional creates a slot.
2. **Action:** Client attempts to book from an address that is > 30 minutes away based on OSRM routing.
3. **Verification:** The booking is rejected with the exact error message: *"This professional is not available in your area for this time slot."*

---

## 🛠 Next Steps
1. Initialize testing environment (install Jest, Supertest, Playwright).
2. Create an isolated test database (e.g., `DATABASE_URL_TEST`) so tests do not pollute development data.
3. Begin writing Phase 1 unit tests for `lib/pricing.ts`.
