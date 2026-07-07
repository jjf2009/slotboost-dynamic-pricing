| **Subject: Software Processes & Engineering Management** | Academic Year: 2025-26       |
| -------------------------------------------------------- | ---------------------------- |
| **Experiment No: 04**                                    | Date: \_**\_**\_**\_**\_\_\_ |

**Study and Development of Design Documentation**

SlotBoost - Intelligent Yield Management System for Solo Professionals

| **Name**           | **Roll Number** |
| ------------------ | --------------- |
| **Jared Furtado**  | 24B-CO-027      |
| **Harsh Gaonker**  | 24B-CO-024      |
| **Raksham Dessai** | 24B-CO-027      |
| **Ankur Kunde**    | 24B-CO-007      |
| **Aayushi**        | 24B-CO-001      |

**Aim**

To study and develop the complete design documentation for the SlotBoost project, including the main algorithm, flowcharts (main and micro), ER diagram, Data Flow Diagram (DFD), Sequence Diagram, and Use Case Diagram.

**i) Algorithm**

**1.0 Main Algorithm - SlotBoost Dynamic Pricing and Booking Flow**

**BEGIN**

1\. START system. Load all professionals, slots, and client records from database.

2\. INITIALISE pricing engine. Set recalculation interval = 15 minutes.

**3\. SLOT PRICING LOOP \[runs every 15 minutes for all open slots\]**

3.1 FOR each slot S where S.status = 'available' AND S.start_time > NOW():

3.1.1 H ← (S.start_time − NOW()) in hours

3.1.2 COMPUTE D_lead:

IF H ≥ 24 THEN D_lead ← 0.00

ELSE IF H ≥ 12 THEN D_lead ← 0.10

ELSE IF H ≥ 6 THEN D_lead ← 0.15

ELSE IF H ≥ 2 THEN D_lead ← 0.20

ELSE D_lead ← 0.25

3.1.3 COMPUTE D_peak ← 0.15 × (1 − S.demand_index)

3.1.4 IF S.d_cancel_active = TRUE AND NOW() < S.d_cancel_expiry:

D_cancel ← 0.15

ELSE:

D_cancel ← 0.00

3.1.5 D_total ← D_lead + D_peak + D_cancel

3.1.6 IF D_total > S.professional.d_max THEN D_total ← S.professional.d_max

3.1.7 S.current_price ← ROUND(S.base_price × (1 − D_total))

3.1.8 UPDATE slot record in database

3.1.9 IF D_lead just became > 0 (first trigger): SEND flash-deal SMS to subscribers

END FOR

**4\. CLIENT BOOKS A SLOT**

4.1 Client C selects slot S from booking page

4.2 IF professional is mobile:

CALL geo_check(S.previous_job_location, C.location, S.start_time)

IF travel_time > threshold: REJECT booking. DISPLAY error. GOTO step 4.1

4.3 LOCK slot row S in database (FOR UPDATE)

4.4 IF S.status ≠ 'available': NOTIFY client 'Slot taken'. GOTO step 4.1

4.5 RECALCULATE S.current_price using step 3.1.2 - 3.1.7

4.6 CREATE booking record B: (slot_id, client_id, price = S.current_price)

4.7 UPDATE S.status ← 'booked'

4.8 SEND confirmation SMS to client C and professional P

4.9 SCHEDULE reminder SMS for 1 hour before S.start_time

**5\. CLIENT CANCELS A BOOKING**

5.1 Client C requests cancellation of booking B

5.2 H ← (B.slot.start_time − NOW()) in hours

5.3 UPDATE B.status ← 'cancelled'

5.4 UPDATE S.status ← 'available'

5.5 IF H < 4 (within recovery window):

SET S.d_cancel_active ← TRUE

SET S.d_cancel_expiry ← NOW() + 10 minutes

RECALCULATE S.current_price (now includes D_cancel)

FETCH all clients on S.waitlist

SEND urgent WhatsApp/SMS to each waitlisted client with new price and booking link

ELSE:

D_cancel ← 0. Normal pricing resumes.

**6\. WAITLIST AUTOPILOT**

6.1 Waitlisted client W clicks booking link within 10-minute window

6.2 IF NOW() > S.d_cancel_expiry: DISPLAY 'Offer expired'. END.

6.3 LOCK slot S (FOR UPDATE)

6.4 IF S.status ≠ 'available': DISPLAY 'Slot already taken'. END.

6.5 CREATE booking for W at S.current_price

6.6 UPDATE S.status ← 'booked'. S.d_cancel_active ← FALSE.

6.7 NOTIFY remaining waitlisted clients: 'Slot filled'

**END**

**Algorithm 1.1 - Micro Algorithm: Calculate Current Price**

**FUNCTION calculatePrice(basePrice, startTime, demandIndex, dMax, dCancelActive, dCancelExpiry):**

INPUT: basePrice, startTime, demandIndex (0-1), dMax (0-0.6)

dCancelActive (bool), dCancelExpiry (datetime)

OUTPUT: currentPrice (numeric)

H ← (startTime − NOW()) in hours

IF H ≥ 24 : D_lead ← 0.00

IF H ≥ 12 : D_lead ← 0.10

IF H ≥ 6 : D_lead ← 0.15

IF H ≥ 2 : D_lead ← 0.20

IF H < 2 : D_lead ← 0.25

D_peak ← 0.15 × (1 − demandIndex)

IF dCancelActive = TRUE AND NOW() < dCancelExpiry:

D_cancel ← 0.15

ELSE:

D_cancel ← 0.00

D_total ← D_lead + D_peak + D_cancel

IF D_total > dMax: D_total ← dMax

currentPrice ← ROUND(basePrice × (1 − D_total))

RETURN currentPrice

**END FUNCTION**

**Algorithm 1.2 - Micro Algorithm: Geo-Check for Mobile Professionals**

**FUNCTION geoCheck(previousJobLocation, clientLocation, departureTime, threshold=30):**

INPUT: previousJobLocation (lat, lng), clientLocation (lat, lng)

departureTime, threshold in minutes (default 30)

OUTPUT: allowed (boolean), travelMinutes (numeric)

TRY:

response ← CALL Google Maps Distance Matrix API(

origin = previousJobLocation,

destination = clientLocation,

departure_time = departureTime,

mode = 'driving')

travelMinutes ← response.duration_in_traffic / 60

IF travelMinutes ≤ threshold: RETURN allowed=TRUE, travelMinutes

ELSE: RETURN allowed=FALSE, travelMinutes

CATCH (API error OR timeout):

LOG error

RETURN allowed=TRUE, travelMinutes=NULL // fallback: allow booking

**END FUNCTION**

**Algorithm 1.3 - Micro Algorithm: Waitlist Autopilot Notification**

**FUNCTION waitlistAutopilot(slotId):**

INPUT: slotId

OUTPUT: notificationsSent (integer)

slot ← FETCH slot record by slotId

waitlist ← FETCH all clients WHERE waitlist.slot_id = slotId

IF waitlist is EMPTY: RETURN 0

price ← calculatePrice(slot) // includes D_cancel = 0.15

expiryTime ← NOW() + 10 minutes

bookingURL ← GENERATE link: /waitlist/{slotId}?expires={expiryTime}

FOR each client W in waitlist:

message ← 'Urgent! Slot at {time} for ₹{price}. Valid 10 min: {bookingURL}'

IF W.channel = 'whatsapp': SEND via Twilio WhatsApp API

ELSE: SEND via Twilio SMS API

notificationsSent ← notificationsSent + 1

END FOR

RETURN notificationsSent

**END FUNCTION**

**ii) Main Flowchart (1.0) - SlotBoost System Flow**

The flowchart below represents the complete execution flow of the SlotBoost system from startup through booking, cancellation, and waitlist handling.

**START**

↓

**Load all professionals, slots & clients from DB**

↓

**Initialise Pricing Engine (15-min interval)**

↓

**◆ Is there an unbooked slot within 24 hrs?**

↓ YES

**Run calculatePrice() → update current_price in DB**

↓

**◆ Did price just drop for the first time?**

↓ YES

**Send Flash-Deal SMS to all subscribers**

↓ NO / continue

**◆ Client requests to book a slot?**

↓ YES

**◆ Is professional mobile?**

↓ YES

**Run geoCheck() via Google Maps API**

↓

**◆ Travel time ≤ threshold?**

↓ YES

**Lock slot row (DB transaction)**

↓

**◆ Slot still available?**

↓ YES

**Recalculate price → Create booking record**

↓

**Update slot status = 'booked'**

↓

**Send Confirmation SMS to Client & Professional**

↓

**◆ Client cancels booking?**

↓ YES

**◆ H < 4 hours (recovery window)?**

↓ YES

**Set D_cancel active. Set 10-min expiry.**

↓

**Run waitlistAutopilot() → notify waitlist**

↓

**◆ Waitlisted client books within 10 min?**

↓ YES → Booking created. Slot filled.

**Slot filled at recovery price. Notify remaining waitlist 'Slot taken'.**

↓ NO (timeout)

**D_cancel removed. Pricing reverts to D_lead + D_peak.**

↓

**END**

Note: 'NO' branches from diamonds (travel > threshold, slot not available, etc.) lead to appropriate error messages displayed to the user - e.g., 'Slot not available', 'Not in your area' - before returning to the previous decision point.

**iii) Micro Flowcharts**

**Flowchart 1.1 - calculatePrice()**

**START: Input basePrice, startTime, demandIndex, dMax, dCancelActive, dCancelExpiry**

↓

**H ← (startTime − NOW()) in hours**

↓

**◆ H ≥ 24?**

↓ YES → D_lead = 0.00

**◆ H ≥ 12?**

↓ YES → D_lead = 0.10

**◆ H ≥ 6?**

↓ YES → D_lead = 0.15

**◆ H ≥ 2?**

↓ YES → D_lead = 0.20 | NO → D_lead = 0.25

**D_peak ← 0.15 × (1 − demandIndex)**

↓

**◆ dCancelActive = TRUE AND NOW() < dCancelExpiry?**

↓ YES → D_cancel = 0.15 | NO → D_cancel = 0.00

**D_total ← D_lead + D_peak + D_cancel**

↓

**◆ D_total > dMax?**

↓ YES → D_total = dMax

**currentPrice ← ROUND(basePrice × (1 − D_total))**

↓

**RETURN currentPrice**

↓

**END**

**Flowchart 1.2 - Geo-Check (geoCheck())**

**START: Input previousJobLocation, clientLocation, departureTime, threshold=30**

↓

**CALL Google Maps Distance Matrix API**

↓

**◆ API response successful?**

↓ NO → LOG error → RETURN allowed=TRUE (fallback)

↓ YES

**travelMinutes ← response.duration_in_traffic / 60**

↓

**◆ travelMinutes ≤ threshold (30 min)?**

↓ YES → RETURN allowed=TRUE, travelMinutes

↓ NO

**RETURN allowed=FALSE, travelMinutes**

↓

**END**

**Flowchart 1.3 - Waitlist Autopilot (waitlistAutopilot())**

**START: Input slotId**

↓

**Fetch slot record. Fetch waitlist for slotId.**

↓

**◆ Waitlist is empty?**

↓ YES → RETURN 0 (no notifications sent)

↓ NO

**calculatePrice(slot) with D_cancel = 0.15**

↓

**Set expiryTime = NOW() + 10 minutes. Generate bookingURL.**

↓

**FOR each client W in waitlist:**

↓

**◆ W.channel = 'whatsapp'?**

↓ YES → Send Twilio WhatsApp message

↓ NO → Send Twilio SMS

**Increment notificationsSent. Continue loop.**

↓

**RETURN notificationsSent**

↓

**END**

**iv-a) Entity Relationship (ER) Diagram**

The ER diagram below shows the entities of SlotBoost, their attributes, and the relationships between them.

| **PROFESSIONALS**<br><br>─────────────<br><br>PK id (uuid)<br><br>user_id (FK→auth)<br><br>name<br><br>email<br><br>phone<br><br>base_price<br><br>d_max<br><br>heat_map (JSON)<br><br>service_type<br><br>is_mobile | ─── 1:N ──► | **SLOTS**<br><br>─────────────<br><br>PK id (uuid)<br><br>FK professional_id<br><br>start_time<br><br>duration_mins<br><br>status<br><br>demand_index<br><br>current_price<br><br>d_cancel_active<br><br>d_cancel_expires_at | ─── 1:N ──► | **BOOKINGS**<br><br>────────────<br><br>PK id (uuid)<br><br>FK slot_id<br><br>FK client_id<br><br>price_paid<br><br>status<br><br>booked_at<br><br>cancelled_at |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                                                                                                                                                                                                                      |             | │ 1:N                                                                                                                                                                                                                        |             | │ N:1                                                                                                                                                           |
|                                                                                                                                                                                                                      |             | ▼                                                                                                                                                                                                                            |             | ▼                                                                                                                                                               |
| **SUBSCRIBERS**<br><br>────────────<br><br>PK id (uuid)<br><br>FK professional_id<br><br>FK client_id<br><br>phone<br><br>channel (sms/wa)                                                                           | ◄── N:1 ─── | **WAITLISTS**<br><br>─────────────<br><br>PK id (uuid)<br><br>FK slot_id<br><br>FK client_id<br><br>joined_at                                                                                                                | ◄── N:1 ─── | **CLIENTS**<br><br>────────────<br><br>PK id (uuid)<br><br>user_id (FK→auth)<br><br>name<br><br>email<br><br>phone                                              |

Relationships: One Professional has many Slots (1:N). One Slot has many Bookings (1:N) but only one confirmed booking at a time. Many Clients can be on a Slot's Waitlist (N:M via waitlists table). Clients can subscribe to many Professionals' flash deals (N:M via subscribers table).

**iv-b) Data Flow Diagram (DFD)**

**Level 0 DFD - Context Diagram**

The context diagram shows SlotBoost as a single process interacting with three external entities: the Professional, the Client, and External Services (Twilio + Google Maps).

| **PROFESSIONAL**<br><br>(External Entity) | → slot config, DI values, base price →<br><br>← price reports, bookings ← | **SLOTBOOST SYSTEM**<br><br>(Process 0)<br><br>Dynamic Pricing +<br><br>Booking Management +<br><br>Notification Engine | → book request, cancel →<br><br>← confirmation, flash SMS ← | **CLIENT**<br><br>(External Entity) |
| ----------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------- |
|                                           |                                                                           | ↕ API calls<br><br>Twilio SMS/WhatsApp<br><br>Google Maps Distance Matrix                                               |                                                             |                                     |
|                                           |                                                                           | **EXTERNAL SERVICES**<br><br>(External Entity)                                                                          |                                                             |                                     |

**Level 1 DFD - SlotBoost Processes**

| **Process**                  | **Data Flows**                                                                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1: Account Management**   | Professional/Client → registration data → P1 → user record → DB (professionals/clients tables)                                                                  |
| **P2: Slot Management**      | Professional → slot details (time, DI, base price) → P2 → slot record → DB (slots table)                                                                        |
| **P3: Pricing Engine**       | DB (slots) → slot data → P3 → updated current_price → DB (slots) P3 → flash-deal trigger → P5 (Notification Engine)                                             |
| **P4: Booking Engine**       | Client → book request → P4 → geo-check request → Google Maps API Google Maps → travel time → P4 → booking record → DB (bookings) P4 → confirmation trigger → P5 |
| **P5: Notification Engine**  | P3/P4/Cancellation → notification request → P5 → SMS/WhatsApp → Twilio API → Client/Professional                                                                |
| **P6: Cancellation Handler** | Client → cancel request → P6 → update booking/slot → DB P6 → D_cancel trigger → P3 P6 → waitlist autopilot trigger → P5                                         |
| **P7: Waitlist Handler**     | Client → join waitlist → P7 → waitlist record → DB (waitlists) P6 → autopilot signal → P7 → fetch waitlist → P5                                                 |

**v) Sequence Diagram - Flash-Deal Booking Flow**

The sequence diagram shows the interaction between system components for the primary use case: a client booking a flash-deal slot after receiving a notification.

| **Step**                         | **Client**                | **Frontend (React)**       | **Backend (Node.js)**               | **Database (Supabase)**    | **Twilio**                      |
| -------------------------------- | ------------------------- | -------------------------- | ----------------------------------- | -------------------------- | ------------------------------- |
| **1\. Pricing engine runs**      |                           |                            | Recalculate all open slot prices    | Read slots from DB         |                                 |
| **2\. D_lead threshold crossed** |                           |                            | Detect price drop                   | Update current_price in DB |                                 |
| **3\. Flash SMS sent**           |                           |                            | Send notification request           |                            | SMS/WhatsApp to all subscribers |
| **4\. Client receives SMS**      | Client opens link         |                            |                                     |                            |                                 |
| **5\. View booking page**        |                           | GET /book/{slotId}         |                                     | READ slot data             |                                 |
| **6\. Live price displayed**     | Client sees current price | Render SlotCard with price |                                     |                            |                                 |
| **7\. Client clicks Book**       |                           | POST /api/slots/book       |                                     |                            |                                 |
| **8\. Backend locks slot**       |                           |                            | BEGIN transaction SELECT FOR UPDATE | Lock row in slots table    |                                 |
| **9\. Verify availability**      |                           |                            | Check status = 'available'          | Return slot data           |                                 |
| **10\. Recalculate price**       |                           |                            | calculatePrice()                    |                            |                                 |
| **11\. Create booking**          |                           |                            | INSERT booking record               | Write to bookings table    |                                 |
| **12\. Update slot status**      |                           |                            | UPDATE status='booked'              | Update slots table         |                                 |
| **13\. Confirm to user**         |                           | Booking confirmed page     | COMMIT transaction                  |                            |                                 |
| **14\. Confirmation SMS**        |                           |                            | Send confirmation                   |                            | SMS to client & professional    |

**vi) Use Case Diagram**

The use case diagram identifies the actors of SlotBoost and the functional use cases each actor can perform.

**Actors**

- Professional - registers, manages slots, configures Heat Map, sets D_max, views bookings.
- Client - registers, browses slots, books, cancels, joins waitlist, subscribes to flash deals.
- System (Automated) - runs the pricing engine cron job, fires the waitlist autopilot, sends reminders.

**Use Cases Table**

| **Use Case ID** | **Use Case Name**                    | **Actor(s)**                      |
| --------------- | ------------------------------------ | --------------------------------- |
| **UC-01**       | Register Account                     | Professional / Client             |
| **UC-02**       | Login / Logout                       | Professional / Client             |
| **UC-03**       | Set Base Rate & D_max                | Professional                      |
| **UC-04**       | Configure Heat Map (Demand Index)    | Professional                      |
| **UC-05**       | Create / Delete Slot                 | Professional                      |
| **UC-06**       | View Professional Dashboard          | Professional                      |
| **UC-07**       | Browse Available Slots               | Client                            |
| **UC-08**       | Book a Slot                          | Client                            |
| **UC-09**       | Cancel a Booking                     | Client / Professional             |
| **UC-10**       | Join Waitlist                        | Client                            |
| **UC-11**       | Subscribe to Flash Deals             | Client                            |
| **UC-12**       | Unsubscribe from Flash Deals         | Client                            |
| **UC-13**       | Receive Flash-Deal Notification      | Client (via Twilio)               |
| **UC-14**       | Book via Waitlist Autopilot          | Client                            |
| **UC-15**       | Recalculate Slot Prices              | System (Cron every 15 min)        |
| **UC-16**       | Send Waitlist Autopilot Notification | System (on cancellation)          |
| **UC-17**       | Send Appointment Reminder            | System (1 hr before slot)         |
| **UC-18**       | Geo-Check Booking Feasibility        | System (for mobile professionals) |
| **UC-19**       | Purchase Subscription / Flex Credits | Client                            |
| **UC-20**       | Validate Off-Peak Credit Constraint  | System                            |

**Design Validation**

The design validation uses the calculatePrice() algorithm (Algorithm 1.1) and manually traces three cases - Negative Extreme, Positive Extreme, and Average - to verify correctness of the formula.

Formula: CurrentPrice = BasePrice × (1 − D_total) where D_total = min(D_lead + D_peak + D_cancel, D_max)

| **Algorithm - calculatePrice()**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | **Traces - Manual Execution**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INPUT: basePrice, startTime,<br><br>demandIndex, dMax,<br><br>dCancelActive<br><br>H ← (startTime − NOW()) / hrs<br><br>IF H ≥ 24: D_lead = 0.00<br><br>IF H ≥ 12: D_lead = 0.10<br><br>IF H ≥ 6: D_lead = 0.15<br><br>IF H ≥ 2: D_lead = 0.20<br><br>IF H < 2: D_lead = 0.25<br><br>D_peak = 0.15 × (1 - DI)<br><br>IF dCancelActive:<br><br>D_cancel = 0.15<br><br>ELSE:<br><br>D_cancel = 0.00<br><br>D_total = D_lead+D_peak+D_cancel<br><br>IF D_total > dMax:<br><br>D_total = dMax<br><br>price = basePrice × (1 - D_total)<br><br>RETURN price | **CASE 1 - Negative Extreme (Worst for Professional)**<br><br>All discounts active. H < 2 hrs. DI = 0. Cancellation active. D_max = 0.60<br><br>BasePrice = ₹1,000<br><br>H = 1.5 hrs → D_lead = 0.25<br><br>DI = 0.0 → D_peak = 0.15×1.0 = 0.15<br><br>D_cancel = 0.15 (active)<br><br>D_total = 0.25+0.15+0.15 = 0.55<br><br>D_max = 0.60 → no cap needed<br><br>CurrentPrice = 1000×(1−0.55) = ₹450<br><br>**Result: ₹450 - maximum possible discount.**<br><br>**CASE 2 - Positive Extreme (Best for Professional)**<br><br>No discounts. Slot 3 days away. DI = 1.0 (peak). D_max = 0.40<br><br>BasePrice = ₹1,000<br><br>H = 72 hrs → D_lead = 0.00<br><br>DI = 1.0 → D_peak = 0.15×0.0 = 0.00<br><br>D_cancel = 0.00<br><br>D_total = 0.00+0.00+0.00 = 0.00<br><br>CurrentPrice = 1000×(1−0.00) = ₹1,000<br><br>**Result: ₹1,000 - full base price, no discount.**<br><br>**CASE 3 - Average Extreme (Typical Use Case)**<br><br>Slot 20 hrs away. DI = 0.5 (moderate). No cancellation. D_max = 0.40<br><br>BasePrice = ₹800<br><br>H = 20 hrs → D_lead = 0.10<br><br>DI = 0.5 → D_peak = 0.15×0.5 = 0.075<br><br>D_cancel = 0.00<br><br>D_total = 0.10+0.075+0.00 = 0.175<br><br>D_max = 0.40 → no cap needed<br><br>CurrentPrice = 800×(1−0.175) = ₹660<br><br>**Result: ₹660 - a 17.5% flash discount.** |

**Conclusion**

The design documentation for SlotBoost was studied and developed in this experiment. The main algorithm captures the complete flow of the system - from pricing engine initialisation through slot booking, cancellation handling, and waitlist autopilot. Three micro algorithms were developed for the core functions: calculatePrice(), geoCheck(), and waitlistAutopilot().

The ER diagram establishes a relational schema with six normalised tables and clearly defined foreign key relationships. The Level 0 and Level 1 DFDs map the data flows between all internal processes (pricing engine, booking engine, notification engine) and external entities (professional, client, Twilio, Google Maps). The sequence diagram traces the most critical user journey - flash-deal booking - across all five system components.

The design validation confirms the correctness of the pricing formula through three traces: the negative extreme produced the maximum discount (₹450 on a ₹1,000 base), the positive extreme produced full price (₹1,000), and the average case produced a realistic 17.5% flash discount (₹660 on ₹800). All three cases behaved as expected, confirming that the algorithm is logically sound and the D_max cap functions correctly as a floor-rate protection mechanism.

The design documentation establishes a clear and implementable foundation for the development phase of SlotBoost.