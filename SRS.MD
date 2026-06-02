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
| **Flex Credits**       | Future subscription feature; not included in the local MVP demonstration.                                                                   |
| **PWA**                | Progressive Web App - a web application that can be installed on a mobile device's home screen.                                             |
| **SRS**                | Software Requirements Specification - this document.                                                                                        |
| **API**                | Application Programming Interface.                                                                                                          |

**1.4 Overview**

Section 2 provides an overall description of the product, users, and operating environment. Section 3 lists all functional requirements. Section 4 defines non-functional requirements. Sections 5-8 cover architecture, interfaces, use cases, and constraints.

**2\. Overall Description**

**2.1 Product Perspective**

SlotBoost is a standalone web application - not a plugin or module for an existing platform. The local MVP interacts with Twilio WhatsApp Sandbox for notifications and free OpenStreetMap services (Nominatim and OSRM) for geo-fill travel time checks. Payment gateway integration is future scope. All MVP data is stored in a PostgreSQL database accessed through Prisma.

**2.2 Product Functions (Summary)**

- Dynamic pricing: automatically calculate CurrentPrice using the formula CurrentPrice = BasePrice × (1 − D_total).
- Flash-deal notifications: send SMS/WhatsApp alerts to subscribed clients when a slot's price drops.
- Booking management: allow clients to book, view, and cancel appointments in real time.
- Waitlist autopilot: automatically notify waitlisted clients of a slot opened by cancellation.
- Geo-fill: restrict bookings for mobile professionals to geographically feasible locations.
- Subscription Flex Credits: future enhancement, documented but excluded from the local MVP.
- Heat Map dashboard: allow professionals to set Demand Index values per time slot.

**2.3 User Classes**

| **User Class**         | **Description**                                                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Solo Professional**  | Independent tutors, cleaners, photographers, or trainers who register on SlotBoost, set their base rate, configure their Heat Map, and manage their slots.                 |
| **Client**             | Individuals who browse a professional's available slots, subscribe to flash-deal notifications, book sessions, and join waitlists.                                         |
| **System (Automated)** | The pricing engine and notification scheduler that run background jobs every 15 minutes to recalculate prices and trigger SMS/WhatsApp alerts when thresholds are crossed. |

**2.4 Operating Environment**

- Frontend: React/Next.js web app, accessible via any modern web browser (Chrome, Firefox, Safari) on desktop or mobile.
- Backend: Node.js 20 LTS with Next.js API routes.
- Database: PostgreSQL 16 accessed with Prisma.
- External APIs: Twilio Programmable Messaging API, Nominatim geocoding API, OSRM routing API.
- Mobile: Responsive web UI for mobile browsers.

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
| **FR-07** | **View Dashboard**     | The system shall display all upcoming slots with their live CurrentPrice, booking status, and waitlist count.                                 |

**3.2 Client Account Management**

| **FR ID** | **Requirement Name**      | **Description**                                                                                                                              |
| --------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-08** | **Register Account**      | The system shall allow a client to register with their name, phone number, and email.                                                        |
| **FR-09** | **Browse Slots**          | The system shall allow a client to view all available slots for a professional, displaying the live CurrentPrice for each slot.              |
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
| **FR-18** | **Trigger Flash-Deal SMS**  | The system shall send a flash-deal SMS/WhatsApp to all subscribed clients when a slot's D_lead first activates (H crosses 24 hrs) and again when H crosses 2 hrs.             |
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
| **FR-27** | **First-Come-First-Served**         | The first waitlisted client to complete the booking within the 10-minute window shall receive the slot. All other waitlisted clients shall receive a 'slot filled' notification.      |

**3.6 Geo-Based Gap Filling**

| **FR ID** | **Requirement Name**            | **Description**                                                                                                                                                                                                                                                           |
| --------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-28** | **Geo-Check on Booking**        | For mobile professionals, before confirming a booking, the system shall use Nominatim and OSRM to check if travel time from the professional's previous job location to the client's location is within the configured threshold (default: 30 minutes).                 |
| **FR-29** | **Block Out-of-Range Bookings** | If the travel time exceeds the threshold, the system shall block the booking and display: 'This professional is not available in your area for this time slot.'                                                                                                           |
| **FR-30** | **Fallback on API Error**       | If the geo-check service returns an error or times out, the geo-check shall be skipped and the booking allowed. The error shall be logged for review.                                                                                                                     |

**3.7 Future Scope: Subscription and Flex Credits**

| **FR ID** | **Requirement Name**             | **Description**                                                                                                                                                                                                          |
| --------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **FR-31** | **Purchase Subscription**        | Future feature. The local MVP shall not process payments or sell subscriptions.                                                                                                                              |
| **FR-32** | **Enforce Off-Peak Requirement** | Future feature. Flex Credit enforcement is not included in the local MVP.                                                                                                                                     |
| **FR-33** | **Credit Expiry Notification**   | Future feature. Credit expiry reminders are not included in the local MVP.                                                                                                                                    |

**4\. Non-Functional Requirements**

| **NFR ID** | **Category**                | **Requirement**                                                                                                                                                                                                                             |
| ---------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NFR-01** | **Performance**             | The booking page shall load within 3 seconds on a 4G mobile connection. The pricing engine shall recalculate all open slot prices within 60 seconds of a threshold being crossed.                                                           |
| **NFR-02** | **Availability**            | The system shall target 99% uptime during business hours (6 AM - 10 PM IST). Scheduled maintenance shall occur between 2 AM and 4 AM IST only.                                                                                              |
| **NFR-03** | **Security**                | All passwords shall be hashed using bcrypt (minimum 12 salt rounds). Protected user actions shall require JWT authentication. Sensitive keys such as Twilio and database credentials shall be stored as environment variables, never in source code. |
| **NFR-04** | **Scalability**             | The backend shall be stateless (no server-side session storage) so that it can be horizontally scaled by adding additional Railway instances if demand increases.                                                                           |
| **NFR-05** | **Usability**               | The client booking page shall be usable with one hand on a smartphone screen. All critical actions (view price, book slot, join waitlist) shall require no more than 3 taps.                                                                |
| **NFR-06** | **Notification Timeliness** | Flash-deal SMS notifications shall be delivered within 60 seconds of a threshold being triggered. Waitlist autopilot messages shall be delivered within 30 seconds of a cancellation.                                                       |
| **NFR-07** | **Data Integrity**          | The database shall enforce referential integrity via foreign key constraints. No booking record shall reference a deleted slot or a non-existent client. All booking transactions shall be ACID-compliant.                                  |
| **NFR-08** | **Maintainability**         | The pricing formula shall be implemented as a single, independently testable JavaScript function with no side effects. Changes to D_max defaults or threshold values shall require only a configuration file change, not a code deployment. |

**5\. System Architecture**

**5.1 Architecture Overview**

SlotBoost follows a three-tier client-server architecture: a React/Next.js frontend, a Node.js API backend, and a PostgreSQL relational database accessed through Prisma. External services (Twilio, Nominatim, and OSRM) are called from the backend only when needed.

**5.2 Component Diagram (Text Representation)**

| **CLIENT (Browser / Web App)**                                                           |
| ---------------------------------------------------------------------------------------- |
| React \| Next.js \| Tailwind CSS                                                         |
| ↕ HTTPS REST API calls                                                                   |
| **BACKEND (Node.js 20 + Next.js API Routes)**                                            |
| Pricing Engine \| Booking API \| Notification Trigger \| Geo-Check Module                |
| ↕ Prisma/PostgreSQL ↕ REST API calls                                                     |
| **DATABASE (PostgreSQL 16) EXTERNAL SERVICES**                                           |
| professionals \| slots \| bookings \| clients \| waitlists Twilio API \| OSRM/Nominatim |

**5.3 Database Schema (Core Tables)**

| **Table**         | **Key Columns**                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **professionals** | id, name, email, phone, base_price, d_max, service_type, heat_map (JSONB), created_at                                   |
| **slots**         | id, professional_id (FK), start_time, duration_mins, status (available/booked), demand_index, current_price, created_at |
| **bookings**      | id, slot_id (FK), client_id (FK), price_paid, booked_at, status (confirmed/cancelled)                                   |
| **clients**       | id, name, email, phone, created_at                                                                                      |
| **waitlists**     | id, slot_id (FK), client_id (FK), joined_at                                                                             |
| **subscriptions** | id, client_id (FK), professional_id (FK), credits_total, credits_used, off_peak_used, billing_month (future feature)    |

**6\. External Interface Requirements**

**6.1 User Interfaces**

- Professional Dashboard: Displays all slots with live CurrentPrice, booking status, waitlist count, and a Heat Map configuration panel. Accessible on desktop and mobile browsers.
- Client Booking Page: Lists available slots with countdown timers for flash deals. Clients can book slots and join the waitlist.
- Waitlist Autopilot Page: A time-limited booking page (10-minute countdown) accessible via the link in the flash-deal WhatsApp/SMS message.

**6.2 Hardware Interfaces**

- No dedicated hardware is required. All users interact with the system via a web browser on their existing smartphone or computer.
- GPS/Location: The client's browser will be asked for location permission to determine their address for the geo-fill check. Location is transmitted to the backend and not stored.

**6.3 Software Interfaces**

| **External System**                 | **Interface Type**      | **Purpose**                                                                                                             |
| ----------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Twilio Programmable Messaging**   | REST API (HTTPS POST)   | Send SMS and WhatsApp notifications for flash deals, booking confirmations, reminders, and waitlist autopilot messages. |
| **Meta WhatsApp Cloud API**         | REST API via Twilio BSP | Deliver rich WhatsApp template messages for high-urgency waitlist autopilot alerts.                                     |
| **Nominatim + OSRM**                | REST API (HTTPS GET)    | Geocode locations and calculate travel time for the geo-fill booking gate using free OpenStreetMap services.            |
| **Payment Gateway**                 | Future integration      | Future scope only; payments and refunds are not part of the local MVP demonstration.                                    |

**6.4 Communication Interfaces**

- All client-server communication shall use HTTPS (TLS 1.2 or higher).
- REST API responses shall use JSON format with standard HTTP status codes (200, 201, 400, 401, 404, 409, 500).
- The pricing engine's background job shall run on a 15-minute cron interval in deployment and can be triggered locally through `GET /api/pricing/recalculate` for demo purposes.

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
- The team has a total budget of ₹0 for third-party services - all APIs and hosting must use free tiers during development (Twilio Sandbox, Nominatim, OSRM, Vercel hobby, and a free PostgreSQL/Supabase database tier).
- WhatsApp Business template messages must be approved by Meta before they can be sent to clients outside the Twilio sandbox. The local MVP uses Twilio Sandbox for demonstration.
- The geo-fill feature requires the client to grant location access in their browser. If permission is denied, the feature is disabled for that booking and the booking proceeds without a geo-check.

**8.2 Assumptions**

- All professionals and clients have a smartphone capable of receiving SMS and WhatsApp messages.
- Professionals will configure their Heat Map accurately based on their historical booking experience. The system does not auto-generate DI values in the MVP - this is a post-MVP enhancement.
- The recovery window (4 hours) and rapid-response window (10 minutes) are fixed in the MVP. Configurable windows are a post-MVP feature.
- Payment gateway integration is future scope. The MVP demonstrates pricing, notification, booking, cancellation, waitlist, and geo-checking without live payment processing.

**9\. References**

**\[1\]** IEEE Computer Society. (1998). IEEE Recommended Practice for Software Requirements Specifications (IEEE Std 830-1998). IEEE.

**\[2\]** Schwaber, K., & Sutherland, J. (2020). The Scrum Guide. Scrum.org. <https://scrumguides.org/scrum-guide.html>

**\[3\]** Twilio Inc. (2024). Programmable Messaging - SMS and WhatsApp API Documentation. <https://www.twilio.com/docs/messaging>

**\[4\]** OpenStreetMap contributors. Nominatim and OSRM documentation. <https://nominatim.org/> and <https://project-osrm.org/>

**\[5\]** PostgreSQL Global Development Group. (2024). PostgreSQL 16 Documentation. <https://www.postgresql.org/docs/16/>

**\[6\]** React Team, Meta Open Source. (2024). React 18 Documentation. <https://react.dev>
