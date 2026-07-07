**Software Requirements Specification (SRS)**

SlotBoost - Intelligent Yield Management System for Solo Professionals

Version 1.0 | Course: Software Processes and Engineering Management

**Submitted by**

| **Name**           | **Roll Number** | **Sign** | **Email**                     |
| ------------------ | --------------- | -------- | ----------------------------- |
| **Jared Furtado**  | 24B-CO-027      |          | <jaredjohnfurtado@gmail.com>  |
| **Harsh Gaonker**  | 24B-CO-024      |          | <harshgaonkar57@gmail.com>    |
| **Raksham Dessai** | 24B-CO-027      |          | <rakshamdessai2006@gmail.com> |
| **Ankur Kunde**    | 24B-CO-007      |          | <ankur.kunde2005@gmail.com>   |
| **Aayushi**        | 24B-CO-001      |          | <aayushiprabhu99@gmail.com>   |

**Index**

| **Sr. No.** | **Section**                     | **Page No.** |
| ----------- | ------------------------------- | ------------ |
| **1**       | Introduction                    | 3            |
| **2**       | Overall Description             | 4            |
| **3**       | Functional Requirements         | 5-7          |
| **4**       | Non-Functional Requirements     | 8            |
| **5**       | System Architecture             | 9            |
| **6**       | External Interface Requirements | 10           |
| **7**       | Use Cases                       | 11-12        |
| **8**       | Constraints and Assumptions     | 13           |
| **9**       | References                      | 13           |

**1\. Introduction**

**1.1 Purpose**

This Software Requirements Specification (SRS) document defines the functional and non-functional requirements for SlotBoost - an Intelligent Yield Management System for Solo Professionals. It serves as the primary reference for the development team, course instructor, and any future stakeholders to understand what the system must do and how it must perform. This document follows the IEEE 830 standard for SRS documentation.

**1.2 Scope**

SlotBoost is a web-based booking and dynamic pricing platform designed for independent service professionals (tutors, cleaners, photographers, fitness trainers). The system automatically discounts unfilled appointment slots as their start time approaches, notifies opted-in clients of flash deals via SMS and WhatsApp, manages a waitlist autopilot for last-minute cancellations, and provides geo-based gap-filling for mobile professionals. The platform is accessible via a mobile-responsive Progressive Web App (PWA) built with React, backed by a Node.js API and a PostgreSQL database.

**1.3 Definitions, Acronyms, and Abbreviations**

| **Term / Acronym**     | **Definition**                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **BasePrice**          | The professional's full, undiscounted hourly/session rate.                                                                                  |
| **CurrentPrice**       | The live price of a slot at any given moment, calculated by the pricing formula.                                                            |
| **D_lead**             | Lead-Time Discount - increases as the slot start time approaches.                                                                           |
| **D_peak**             | Off-Peak Discount - based on the Demand Index (DI) of the time slot.                                                                        |
| **D_cancel**           | Cancellation Recovery Discount - triggered when a confirmed booking is cancelled within the recovery window.                                |
| **D_max**              | Maximum discount cap set by the professional (default: 40%).                                                                                |
| **DI**                 | Demand Index - a value between 0 (no demand) and 1 (peak demand) assigned by the professional to each time slot via the Heat Map dashboard. |
| **Flash Deal**         | An automatically triggered, time-limited discount on a slot nearing its start time.                                                         |
| **Waitlist Autopilot** | The automated system that notifies waitlisted clients when a cancellation occurs within the recovery window.                                |
| **Recovery Window**    | The time period before a slot (default: 4 hours) within which a cancellation triggers D_cancel and the Waitlist Autopilot.                  |
| **Flex Credits**       | Session credits in the subscription plan, where at least one credit must be used in an off-peak slot.                                       |
| **PWA**                | Progressive Web App - a web application that can be installed on a mobile device's home screen.                                             |
| **SRS**                | Software Requirements Specification - this document.                                                                                        |
| **API**                | Application Programming Interface.                                                                                                          |

**1.4 Overview**

Section 2 provides an overall description of the product, users, and operating environment. Section 3 lists all functional requirements. Section 4 defines non-functional requirements. Sections 5-8 cover architecture, interfaces, use cases, and constraints.

**2\. Overall Description**

**2.1 Product Perspective**

SlotBoost is a standalone web application - not a plugin or module for an existing platform. **As implemented (July 2026):** the MVP uses Twilio WhatsApp sandbox for notifications, OSRM + Nominatim (free) for geo-fill travel checks (`app/api/geo/check/route.ts`), and PostgreSQL via Prisma (`prisma/schema.prisma`). Auth is JWT in httpOnly cookies, not a third-party auth provider. A payment gateway (Razorpay) is a stretch goal only. The frontend is served from Vercel.

**2.2 Product Functions (Summary)**

- Dynamic pricing: automatically calculate CurrentPrice using the formula CurrentPrice = BasePrice × (1 − D_total).
- Flash-deal notifications: send WhatsApp alerts to subscribed clients when lead-time thresholds are crossed (see FR-18 implementation note).
- Booking management: allow clients to book, view, and cancel appointments; prices refresh on page load and cron recalculation (no live push subscription in MVP).
- Waitlist autopilot: automatically notify waitlisted clients of a slot opened by cancellation.
- Geo-fill: restrict bookings for mobile professionals to geographically feasible locations.
- Subscription Flex Credits: **data model defined** (`subscriptions` table); **API/UI not built** in MVP (see FR-31–33).
- Heat Map dashboard: allow professionals to set Demand Index values per time slot.

**2.3 User Classes**

| **User Class**         | **Description**                                                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Solo Professional**  | Independent tutors, cleaners, photographers, or trainers who register on SlotBoost, set their base rate, configure their Heat Map, and manage their slots.                 |
| **Client**             | Individuals who browse a professional's available slots, subscribe to flash-deal notifications, book sessions, and join waitlists.                                         |
| **System (Automated)** | The pricing engine and notification scheduler that run background jobs every 15 minutes to recalculate prices and trigger SMS/WhatsApp alerts when thresholds are crossed. |

**2.4 Operating Environment**

**Original SRS target** described a React PWA with Express on Railway. **Actual MVP implementation:**

- Frontend: Next.js 15 / React 19, mobile-responsive web app on Vercel (not a PWA — no service worker or install manifest).
- Backend: Next.js App Router API routes (no separate Express server).
- Database: PostgreSQL via Prisma (`DATABASE_URL` / `DIRECT_URL`).
- Auth: JWT (`JWT_SECRET`), bcrypt password hashing, httpOnly cookie — `lib/getUser.ts`.
- External APIs: Twilio WhatsApp sandbox; OSRM + Nominatim for geo (no Google Maps API key).
- Pricing cron: Vercel cron → `GET /api/pricing/recalculate`, protected by `CRON_SECRET` (`lib/cron-auth.ts`).

**3\. Functional Requirements**

**3.1 Professional Account Management**

| **FR ID** | **Requirement Name**   | **Description**                                                                                                                               |
| --------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-01** | **Register Account**   | The system shall allow a professional to register with their name, service type, phone number, email, and password.                           |
| **FR-02** | **Set Base Rate**      | The system shall allow the professional to set a BasePrice (minimum ₹100, maximum ₹50,000) per session.                                       |
| **FR-03** | **Set D_max**          | The system shall allow the professional to configure a maximum discount cap (D_max) between 0% and 60%. Default is 40%.                       |
| **FR-04** | **Configure Heat Map** | The system shall provide a Heat Map UI where the professional assigns a Demand Index (DI) value between 0.0 and 1.0 to each hour of the week. |
| **FR-05** | **Create Slots**       | The system shall allow the professional to create appointment slots with a date, start time, duration, and service type.                      |
| **FR-06** | **Delete Slots**       | The system shall prevent deletion of a slot that has an active booking. An error message shall be displayed.                                  |
| **FR-07** | **View Dashboard**     | The system shall display all upcoming slots with CurrentPrice (computed server-side on each dashboard load), booking status, and waitlist count. |

**3.2 Client Account Management**

| **FR ID** | **Requirement Name**      | **Description**                                                                                                                              |
| --------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-08** | **Register Account**      | The system shall allow a client to register with their name, phone number, and email.                                                        |
| **FR-09** | **Browse Slots**          | The system shall allow a client to view all available slots for a professional, displaying CurrentPrice computed at request time for each slot. |
| **FR-10** | **Opt-In to Flash Deals** | The system shall allow a client to subscribe to flash-deal SMS/WhatsApp notifications for a specific professional.                           |
| **FR-11** | **Opt-Out**               | The system shall allow a client to unsubscribe from a professional's notifications at any time. Removal shall take effect within 60 seconds. |
| **FR-12** | **Join Waitlist**         | The system shall allow a client to join the waitlist for a fully-booked slot.                                                                |

**3.3 Dynamic Pricing Engine**

| **FR ID** | **Requirement Name**        | **Description**                                                                                                                                                               |
| --------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-13** | **Calculate CurrentPrice**  | The system shall calculate CurrentPrice = BasePrice × (1 − D_total) where D_total = min(D_lead + D_peak + D_cancel, D_max), recalculated every 15 minutes for all open slots. |
| **FR-14** | **Apply D_lead**            | The system shall apply the lead-time discount based on hours remaining (H): H≥24→0%, 12≤H<24→10%, 6≤H<12→15%, 2≤H<6→20%, H<2→25%.                                             |
| **FR-15** | **Apply D_peak**            | The system shall apply D_peak = 0.15 × (1 − DI) based on the Demand Index configured by the professional for that time slot.                                                  |
| **FR-16** | **Apply D_cancel**          | The system shall apply D_cancel = 0.15 when a confirmed booking is cancelled within the recovery window (default: 4 hours before slot start).                                 |
| **FR-17** | **Enforce D_max**           | The system shall ensure D_total never exceeds D_max. If D_lead + D_peak + D_cancel > D_max, D_total shall be capped at D_max.                                                 |
| **FR-18** | **Trigger Flash-Deal SMS**  | The system shall send a flash-deal WhatsApp to all subscribed clients when H crosses below 24 hours (D_lead first activates) and again when H crosses below 2 hours. **Implementation:** `lib/flash-deal-trigger.ts` — `shouldSendFlashDealAlert()` returns true when `(previousHours >= 24 && hoursRemaining < 24)` OR `(previousHours >= 2 && hoursRemaining < 2)`; previous hours default to `hoursRemaining + 0.25` (15-min cron interval). Does **not** fire on every price drop within the same lead-time bucket. |
| **FR-19** | **Price Freeze on Booking** | Once a slot is booked, CurrentPrice shall be frozen at the value at the time of booking. No further discounts shall apply.                                                    |

**3.4 Booking and Cancellation**

| **FR ID** | **Requirement Name**          | **Description**                                                                                                                                                                             |
| --------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-20** | **Book a Slot**               | The system shall allow a client to book an available slot at its CurrentPrice. The slot status shall change to 'Booked' atomically using a database transaction to prevent double bookings. |
| **FR-21** | **Booking Confirmation SMS**  | The system shall send a confirmation SMS to both the client and the professional within 30 seconds of a successful booking.                                                                 |
| **FR-22** | **Client Cancellation**       | The system shall allow a client to cancel a booking. If cancellation occurs within the recovery window (H < 4 hrs), D_cancel shall be activated and the Waitlist Autopilot shall fire.      |
| **FR-23** | **Professional Cancellation** | The system shall allow a professional to cancel a confirmed booking. A full refund shall be initiated and the client notified via SMS.                                                      |
| **FR-24** | **Reminder Notification**     | The system shall send a reminder SMS to the client 1 hour before the appointment start time.                                                                                                |

**3.5 Waitlist Autopilot**

| **FR ID** | **Requirement Name**                | **Description**                                                                                                                                                                       |
| --------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-25** | **Notify Waitlist on Cancellation** | When a cancellation triggers D_cancel, the system shall immediately send an urgent flash-deal SMS/WhatsApp to all clients on the waitlist for that slot.                              |
| **FR-26** | **10-Minute Booking Window**        | The discounted price advertised to the waitlist shall be valid for exactly 10 minutes. After expiry, D_cancel shall be removed and CurrentPrice shall revert to D_lead + D_peak only. |
| **FR-27** | **First-Come-First-Served**         | The first waitlisted client to complete the booking within the 10-minute window shall receive the slot. Only clients with an existing waitlist entry may use `POST /api/waitlist/book` (others receive 403). Remaining waitlisted clients shall receive a `slot_filled` WhatsApp via `/api/notifications/send`. |

**3.6 Geo-Based Gap Filling**

| **FR ID** | **Requirement Name**            | **Description**                                                                                                                                                                                                                                                           |
| --------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-28** | **Geo-Check on Booking**        | For mobile professionals (`is_mobile`), before confirming a booking, the system shall geocode origin/destination via Nominatim and compute driving time via OSRM (`app/api/geo/check/route.ts`), called from `app/api/slots/book/route.ts`. Threshold: 30 minutes. No Google Maps API key required. |
| **FR-29** | **Block Out-of-Range Bookings** | If travel time exceeds the threshold, the system shall block the booking and return: 'This professional is not available in your area for this time slot.' (HTTP 403).                                                                                                           |
| **FR-30** | **Fallback on API Error**       | If Nominatim or OSRM fails, the geo-check shall allow the booking (`allowed: true, fallback: true`). Errors are logged.                                                                                                             |

**3.7 Subscription and Flex Credits**

> **MVP status:** `Subscription` model exists in `prisma/schema.prisma` only. No purchase API, credit consumption, or UI. UC-19/UC-20 are **not functional** in the current codebase.

| **FR ID** | **Requirement Name**             | **Description**                                                                                                                                                                                                          |
| --------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **FR-31** | **Purchase Subscription**        | *(Stretch / not built)* Monthly plan purchase via Razorpay — schema only.                                                                     |
| **FR-32** | **Enforce Off-Peak Requirement** | *(Stretch / not built)* Off-peak credit rule — schema only. |
| **FR-33** | **Credit Expiry Notification**   | *(Stretch / not built)* Credit expiry reminder — not implemented.                                                                                        |

**4\. Non-Functional Requirements**

| **NFR ID** | **Category**                | **Requirement**                                                                                                                                                                                                                             |
| ---------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NFR-01** | **Performance**             | The booking page shall load within 3 seconds on a 4G mobile connection. The pricing engine shall recalculate all open slot prices within 60 seconds of a threshold being crossed.                                                           |
| **NFR-02** | **Availability**            | The system shall target 99% uptime during business hours (6 AM - 10 PM IST). Scheduled maintenance shall occur between 2 AM and 4 AM IST only.                                                                                              |
| **NFR-03** | **Security**                | Passwords hashed with bcrypt (12 rounds). Protected API routes use JWT httpOnly cookies (`getUserFromRequest`). Cron endpoint requires `CRON_SECRET`. Twilio and DB credentials in env vars only. **Note:** Not all routes require auth (e.g. public booking, notifications/send).               |
| **NFR-04** | **Scalability**             | The backend shall be stateless (no server-side session storage) so that it can be horizontally scaled by adding additional Railway instances if demand increases.                                                                           |
| **NFR-05** | **Usability**               | The client booking page shall be usable with one hand on a smartphone screen. All critical actions (view price, book slot, join waitlist) shall require no more than 3 taps.                                                                |
| **NFR-06** | **Notification Timeliness** | Flash-deal SMS notifications shall be delivered within 60 seconds of a threshold being triggered. Waitlist autopilot messages shall be delivered within 30 seconds of a cancellation.                                                       |
| **NFR-07** | **Data Integrity**          | The database shall enforce referential integrity via foreign key constraints. No booking record shall reference a deleted slot or a non-existent client. All booking transactions shall be ACID-compliant.                                  |
| **NFR-08** | **Maintainability**         | The pricing formula shall be implemented as a single, independently testable JavaScript function with no side effects. Changes to D_max defaults or threshold values shall require only a configuration file change, not a code deployment. |

**5\. System Architecture**

**5.1 Architecture Overview**

**As implemented:** Next.js 15 full-stack app (React UI + App Router API routes) with PostgreSQL via Prisma. External services (Twilio, Nominatim, OSRM) are called from API routes only — not from the browser.

**5.2 Component Diagram (Text Representation)**

| **CLIENT (Browser — mobile-responsive, not PWA)**                                        |
| ---------------------------------------------------------------------------------------- |
| Next.js 15 / React 19 \| Tailwind CSS \| TanStack Query                                  |
| ↕ HTTPS REST API calls (same Next.js app)                                                |
| **API ROUTES (app/api/)**                                                                |
| Pricing cron \| Booking \| Notifications \| Geo (OSRM/Nominatim) \| JWT Auth             |
| ↕ Prisma ORM ↕ External HTTP APIs                                                        |
| **DATABASE (PostgreSQL) EXTERNAL SERVICES**                                                |
| users \| professionals \| slots \| bookings \| clients \| waitlists \| subscribers Twilio WhatsApp \| OSRM \| Nominatim |

**5.3 Database Schema (Core Tables)**

| **Table**         | **Key Columns**                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **professionals** | id, name, email, phone, base_price, d_max, service_type, heat_map (JSONB), created_at                                   |
| **slots**         | id, professional_id (FK), start_time, duration_mins, status (available/booked), demand_index, current_price, created_at |
| **bookings**      | id, slot_id (FK), client_id (FK), price_paid, booked_at, status (confirmed/cancelled)                                   |
| **clients**       | id, name, email, phone, created_at                                                                                      |
| **waitlists**     | id, slot_id (FK), client_id (FK), joined_at                                                                             |
| **subscriptions** | id, client_id (FK), professional_id (FK), credits_total, credits_used, off_peak_used, billing_month                     |

**6\. External Interface Requirements**

**6.1 User Interfaces**

- Professional Dashboard: Displays all slots with live CurrentPrice, booking status, waitlist count, and a Heat Map configuration panel. Accessible on desktop and mobile browsers.
- Client Booking Page: Lists available slots with prices computed at load time. Clients can book and join the waitlist. Flex Credits UI is **not built**.
- Waitlist Autopilot Page: A time-limited booking page (10-minute countdown) accessible via the link in the flash-deal WhatsApp/SMS message.

**6.2 Hardware Interfaces**

- No dedicated hardware is required. All users interact with the system via a web browser on their existing smartphone or computer.
- GPS/Location: The client's browser will be asked for location permission to determine their address for the geo-fill check. Location is transmitted to the backend and not stored.

**6.3 Software Interfaces**

| **External System**                 | **Interface Type**      | **Purpose**                                                                                                             |
| ----------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Twilio Programmable Messaging**   | REST API (HTTPS POST)   | Send SMS and WhatsApp notifications for flash deals, booking confirmations, reminders, and waitlist autopilot messages. |
| **Meta WhatsApp Cloud API**         | REST API via Twilio BSP | Deliver rich WhatsApp template messages for high-urgency waitlist autopilot alerts.                                     |
| **OSRM + Nominatim (OpenStreetMap)** | Public HTTP APIs       | Geocode addresses and compute driving duration for geo-fill (`app/api/geo/check/route.ts`). No API key.          |
| **Payment Gateway (Razorpay)**      | REST API + Webhook      | *(Stretch / not built)* Subscription payments and refunds.                                                      |

**6.4 Communication Interfaces**

- All client-server communication shall use HTTPS (TLS 1.2 or higher).
- REST API responses shall use JSON format with standard HTTP status codes (200, 201, 400, 401, 404, 409, 500).
- The pricing engine runs on a 15-minute Vercel cron (`vercel.json` → `GET /api/pricing/recalculate`), authenticated with `CRON_SECRET` (`lib/cron-auth.ts`).

**7\. Use Cases**

**7.1 Use Case: Client Books a Flash-Deal Slot**

| **Use Case ID**    | UC-01                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**  | Client Books a Flash-Deal Slot                                                                                                                                                                                                                                                                                                                                                               |
| **Primary Actor**  | Client                                                                                                                                                                                                                                                                                                                                                                                       |
| **Preconditions**  | Client is registered and opted into flash-deal notifications. A slot's D_lead has activated (H < 24 hrs).                                                                                                                                                                                                                                                                                    |
| **Main Flow**      | 1\. System sends flash-deal SMS/WhatsApp to client with CurrentPrice and booking link. 2. Client opens the booking link and views the discounted price with time remaining. 3. Client taps 'Book Now' and confirms. 4. System creates booking atomically (DB transaction). 5. System sends confirmation SMS to client and professional. 6. Slot status changes to 'Booked'. Price is frozen. |
| **Alternate Flow** | If the slot is taken by another client between steps 3 and 4, the system shows 'Slot just taken. Would you like to join the waitlist?' No charge is made.                                                                                                                                                                                                                                    |
| **Postconditions** | Slot is booked at the CurrentPrice at the time of confirmation. Both parties are notified.                                                                                                                                                                                                                                                                                                   |
| **Related FRs**    | FR-13, FR-14, FR-15, FR-18, FR-19, FR-20, FR-21                                                                                                                                                                                                                                                                                                                                              |

**7.2 Use Case: Waitlist Autopilot (Cancellation Recovery)**

| **Use Case ID**    | UC-02                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**  | Waitlist Autopilot - Cancellation Recovery                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Primary Actor**  | System (Automated), Client                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Preconditions**  | A slot has an active booking. At least one client is on the waitlist. Cancellation occurs within the recovery window (H < 4 hrs).                                                                                                                                                                                                                                                                                                                                                                     |
| **Main Flow**      | 1\. Client cancels their confirmed booking. 2. System detects cancellation within recovery window. D_cancel = 0.15 is activated. 3. System recalculates CurrentPrice with D_cancel included (capped by D_max). 4. System sends urgent WhatsApp/SMS to all waitlisted clients with the new price and a 10-minute deadline. 5. First waitlisted client taps the link and books within 10 minutes. 6. Slot is booked. Remaining waitlisted clients receive 'Slot filled' notification. D_cancel removed. |
| **Alternate Flow** | If no waitlisted client books within 10 minutes: D_cancel is removed, CurrentPrice reverts to D_lead + D_peak. Slot remains available.                                                                                                                                                                                                                                                                                                                                                                |
| **Postconditions** | Slot is either booked at the recovery price or remains available at the non-D_cancel price.                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Related FRs**    | FR-22, FR-25, FR-26, FR-27                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

**7.3 Use Case: Professional Configures Heat Map**

| **Use Case ID**    | UC-03                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Use Case Name**  | Professional Configures Heat Map                                                                                                                                                                                                                                                                                                                                                                                   |
| **Primary Actor**  | Professional                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Preconditions**  | Professional is registered and logged into the dashboard.                                                                                                                                                                                                                                                                                                                                                          |
| **Main Flow**      | 1\. Professional opens the Heat Map panel. 2. For each time slot (hour × day of week), professional sets a DI value between 0.0 (no demand) and 1.0 (peak demand) using a slider. 3. Professional saves the configuration. 4. System stores the DI values as a JSONB object in the professional's database record. 5. All future D_peak calculations for that professional's slots will use the updated DI values. |
| **Postconditions** | Heat Map saved. D_peak values updated for all future slot price calculations.                                                                                                                                                                                                                                                                                                                                      |
| **Related FRs**    | FR-04, FR-15                                                                                                                                                                                                                                                                                                                                                                                                       |

**8\. Constraints and Assumptions**

**8.1 Constraints**

- The system must be deliverable as a working prototype within 12 weeks (6 Agile sprints of 2 weeks each).
- The team has a total budget of ₹0 for third-party services - development uses free tiers (Twilio trial/sandbox, OSRM/Nominatim, Vercel hobby, PostgreSQL hosting).
- WhatsApp Business template messages must be approved by Meta before they can be sent to clients outside the Twilio sandbox. Approval typically takes 1-3 business days and must be initiated in Sprint 3 to be ready for Sprint 4.
- Geo-fill for mobile professionals requires the client to supply a location/address string in the booking request (`clientLocation`). If geocoding fails, booking is allowed (fallback per FR-30).

**8.2 Assumptions**

- All professionals and clients have a smartphone capable of receiving SMS and WhatsApp messages.
- Professionals will configure their Heat Map accurately based on their historical booking experience. The system does not auto-generate DI values in the MVP - this is a post-MVP enhancement.
- The recovery window (4 hours) and rapid-response window (10 minutes) are fixed in the MVP. Configurable windows are a post-MVP feature.
- Payment gateway integration (Razorpay) is a stretch goal for Sprint 6. If not completed, the MVP will demonstrate the pricing and notification features without live payment processing.

**9\. References**

**\[1\]** IEEE Computer Society. (1998). IEEE Recommended Practice for Software Requirements Specifications (IEEE Std 830-1998). IEEE.

**\[2\]** Schwaber, K., & Sutherland, J. (2020). The Scrum Guide. Scrum.org. <https://scrumguides.org/scrum-guide.html>

**\[3\]** Twilio Inc. (2024). Programmable Messaging - SMS and WhatsApp API Documentation. <https://www.twilio.com/docs/messaging>

**\[4\]** OpenStreetMap Foundation. Nominatim & OSRM routing (used in MVP geo-check). <https://nominatim.org/> <https://project-osrm.org/>

**\[5\]** PostgreSQL Global Development Group. (2024). PostgreSQL 16 Documentation. <https://www.postgresql.org/docs/16/>

**\[6\]** React Team, Meta Open Source. (2024). React 18 Documentation. <https://react.dev>