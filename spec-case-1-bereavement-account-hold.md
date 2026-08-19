# Spec: Automated Bereavement Account Hold

**Team:** Smart Citizen
**Use case:** #1 from `use-cases.md`
**Status:** Ready to build
**Time budget:** 3 hours

---

## 1. Problem

When a person dies, their bank accounts often keep receiving and paying out funds (pensions, standing orders, automatic withdrawals) because the bank has no timely, automated way of learning that a death occurred. This is a well-known source of fraud and misdirected payments in G2P and banking systems. Civil Registration confirms deaths, but there is no automatic bridge from "death confirmed" to "bank account flagged."

## 2. Solution summary

Sri Lanka's Civil Registration system already has a real, government-built API for exactly this: **`POST /death-notifications`** on **Death Notification Services**, which broadcasts a confirmed death to a fixed list of secondary organizations — and `BANK` is one of the built-in recipient codes, alongside `PENSION`, `EPF`, `ETF`, `WBB`, `INSURANCE`, `IRD`, `CEB`, `WATER_BOARD`, `TELCO`.

So the flow is not a workaround — it's the intended use of a real catalog API:

1. A Civil Registration officer enters a death using a real web form — name, NIC, address, date/place of death, etc. — built as its own small app.
2. Submitting the form registers and confirms the death in Death Registration Services (real API), using only the fields that API actually accepts.
3. Civil Registration's app broadcasts the confirmed death via Death Notification Services, listing `BANK` as a recipient.
4. Our mock **Bank** receiving endpoint gets the notification, looks up the SLUDI in its customer list, and flags the matching account as **ON HOLD**.
5. A simple bank dashboard shows the account's status flip from Active → On Hold in real time.
6. *(Optional, time permitting)* Payments API is used to show a payment attempt against the held account being blocked, as an illustrative extra — not required for the core story.

No polling. No custom "subscribe" feature. The government API already pushes to the bank; we just have to be the `BANK` on the receiving end.

**Important field note:** the real Death Registration Services API does **not** have NIC or address fields — its schema only has `sludi`, `deceasedName`, `dateOfDeath`, `timeOfDeath`, `placeOfDeath`, `district`, `division`, `deathNature`, plus parent/guardian SLUDI and `reportedBy`. The Civil Registration form should only collect and submit fields the real API accepts (see §4.1) — no local-only NIC/address capture, to keep the demo strictly honest about what the government API actually supports.

## 3. Architecture

```
┌─────────────────────────────┐
│  Civil Registration App      │
│  (built by us — web form)    │
│  Name, NIC, address, DOB,    │
│  date/place of death, etc.   │
└──────────┬────────────────────┘
           │ 1. on submit: map form → API fields,
           │    POST /death-registration/register
           │    POST /death-registration/verify
           ▼
┌──────────────────────┐
│  Death Registration   │
│  Services (real API)  │
└──────────┬─────────────┘
           │ 2. POST /death-notifications
           │    recipients: ["BANK"]        (called by the same
           ▼                                 Civil Registration App)
┌──────────────────────┐
│  Death Notification   │
│  Services (real API)  │
└──────────┬─────────────┘
           │ (synchronous ack in response body —
           │  no separate delivery to our server;
           │  see §5 note on "receiving" the notification)
           ▼
┌───────────────────────────────────────────┐
│  Smart Citizen Bank App (built by us)      │
│  ┌─────────────┐   ┌─────────────────────┐│
│  │ mock-bank-  │   │  Bank Dashboard      ││
│  │ api (Node/  │──▶│  (simple web page)   ││
│  │ Express)    │   │  shows account list  ││
│  │ - customers │   │  + status            ││
│  │   .json     │   └─────────────────────┘│
│  └─────────────┘                          │
└───────────────────────────────────────────┘
```

## 4. Components

### 4.1 Civil Registration App (`civil-registration-app`)
- **What it does:** a small standalone web app with a death registration form. An officer fills in the deceased's details and submits.
  - **Form fields shown to the officer** (for realism, matches how a registrar actually works): Full Name, NIC, Address, Date of Birth *(display/record-keeping only)*, Date of Death, Time of Death, Place of Death, District, Division, Death Nature (Natural/Sudden/Suspicious), Person Type (Adult/Minor/Newborn), SLUDI, Reported By (officer ID).
  - **Fields actually sent to Death Registration Services** on submit — only these exist in the real API schema: `sludi`, `personType`, `deceasedName`, `dateOfDeath`, `timeOfDeath`, `placeOfDeath`, `district`, `division`, `deathNature`, `motherSludi`/`fatherSludi`/`guardianSludi` (as applicable), `reportedBy`. **NIC, address, and date of birth are captured in the form and shown in a local "Registered Deaths" list within this app, but are not sent to the government API** — call this out plainly in the UI (e.g. a small note: "NIC/address kept for local records; not part of the national schema") so it isn't mistaken for the real API's data model.
  - On submit, the app calls `POST /death-registration/register`, then immediately calls `POST /death-registration/verify` with `status: Confirmed` (skip the separate investigation workflow for the demo — treat every demo death as an already-verified Natural death, since only Medical Officers/Coroners would normally submit `/verify`).
  - Once confirmed, the app calls `GET /death-notifications/confirmed` then `POST /death-notifications` with `recipients: ["BANK"]`.
  - Shows the officer a simple status trail per submitted case: Registered → Confirmed (+ certificate ref) → Bank Notified (+ bank reference number).
- **How it's used:** this is what's on screen for the Civil Registration officer during the demo — filling and submitting the form live.
- **Depends on:** Death Registration Services, Death Notification Services (both real, sandboxed, Bearer-token-gated).

### 4.2 Mock Bank API (`bank-api`)
- **What it does:** exposes one endpoint that represents "the bank's system receiving a death notification." Looks up the deceased's SLUDI against a small seeded customer list; if found, updates that customer's status to `ON_HOLD` and stores an audit entry (when, why, source notification ID).
- **How it's used:** called by our own trigger script right after the DNA-02 broadcast succeeds (see §5 note — this is a deliberate simplification of "the bank received the broadcast").
- **Depends on:** nothing external — it's our own small service (in-memory or JSON-file store is fine for 3 hours).

### 4.3 Bank Dashboard (`bank-dashboard`)
- **What it does:** a simple web page listing mock bank customers (name, SLUDI, account no., balance, status). Polls or refreshes to show status changes live.
- **How it's used:** this is what's on screen during the demo — the "aha" moment is watching a customer's row flip from Active to On Hold right after the death is registered.
- **Depends on:** Mock Bank API for data.

## 5. Data flow — step by step

1. **Officer fills the form** in the Civil Registration App — name, NIC, address, DOB, date/time/place of death, district, division, death nature, SLUDI, reported-by. (Must use a SLUDI already seeded in the bank's customer list, for the demo to show a match.)
2. **Register death** — app calls `POST /death-registration/register` on Death Registration Services with only the API-supported fields.
3. **Confirm death** — app calls `POST /death-registration/verify` with `status: Confirmed` and a cause of death. Response includes `deathRegistrationId`.
4. **Fetch confirmed record** — app calls `GET /death-notifications/confirmed?deathRegistrationId=...` on Death Notification Services (required to be `Confirmed` before notifying).
5. **Broadcast notification** — app calls `POST /death-notifications` with `recipients: ["BANK"]` (add others for realism if time allows). Response returns per-recipient status (`Acknowledged` / `Failed` / `Pending`) and a reference number for `BANK`.
6. **Bank receives and acts** — **Important limitation:** this sandbox API's `POST /death-notifications` is synchronous and only returns an acknowledgment in its response — it does not actually call out to a real bank webhook. So the Civil Registration App, immediately after getting `Acknowledged` for `BANK` back from step 5, calls our **own** Mock Bank API's `/notify` endpoint directly, passing the SLUDI and death date. This is the one deliberately simulated step, and it should be described honestly in the demo as: "In production, the Death Notification Service would push this to the bank's registered webhook; in our sandbox demo we call our bank endpoint directly since outbound webhook delivery isn't available in the sandbox."
7. **Account flagged** — Mock Bank API sets the matching customer's `status` to `ON_HOLD`, records `heldReason`, `heldAt`, `sourceNotificationId`.
8. **Dashboard updates** — Bank Dashboard reflects the new status (poll every 2–3 seconds, or manual refresh button — simplest wins here).
9. *(Optional)* **Illustrate the block** — call Payments `POST /api/sandbox/initiate` for a mock payout to that customer, and note in the demo that a real integration would check hold status before allowing this.

## 6. API reference (exact shapes, from the live OpenAPI specs)

### 6.1 Death Registration Services
Base URL: `https://sgateway.stg.devportal.gov.lk/death-registration-services-v1-0-0`

**`POST /death-registration/register`**
```json
{
  "sludi": "SLU123456",
  "personType": "Adult",
  "deceasedName": "John Silva",
  "dateOfDeath": "2026-08-10",
  "timeOfDeath": "14:30",
  "placeOfDeath": "National Hospital Colombo",
  "district": "Colombo",
  "division": "Colombo",
  "deathNature": "Natural",
  "motherSludi": null,
  "fatherSludi": null,
  "guardianSludi": null,
  "reportedBy": "MO123"
}
```
→ `201`: `{ "deathRegistrationId": "DR001", "status": "Pending", "message": "...", "createdAt": "..." }`

**`POST /death-registration/verify`**
```json
{
  "deathRegistrationId": "DR001",
  "actorType": "MedicalOfficer",
  "actorId": "MO123",
  "status": "Confirmed",
  "causeOfDeath": "Heart Failure",
  "investigationRequired": false,
  "awaitingInformation": false,
  "requiredDocuments": [],
  "remarks": "Verified natural death from clinical history."
}
```
→ `200`: `{ "deathRegistrationId": "DR001", "previousStatus": "Pending", "currentStatus": "Confirmed", "certificateGenerated": true, "certificateReferenceNo": "DC-2026-COL-009281", "updatedAt": "..." }`

**`GET /death-record?deathRegistrationId=DR001`** — full record with `verificationHistory` and `certificateDetails`.

### 6.2 Death Notification Services
Base URL: `https://sgateway.stg.devportal.gov.lk/death-notification-services-v1-0-0`

**`GET /death-notifications/confirmed?deathRegistrationId=DR-2026-001245`**
→ `200`: `{ "deathRegistrationId": "DR-2026-001245", "sludi": "SLU123456789", "dateOfDeath": "2026-08-10", "status": "Confirmed" }`
(Errors `422` if the record isn't `Confirmed` yet.)

**`POST /death-notifications`**
```json
{
  "notificationId": "DN-2026-000001",
  "deathRegistrationId": "DR-2026-001245",
  "sludi": "SLU123456789",
  "dateOfDeath": "2026-08-10",
  "recipients": ["BANK"],
  "notificationDateTime": "2026-08-11T10:30:00Z"
}
```
→ `200`:
```json
{
  "notificationId": "DN-2026-000001",
  "status": "Processed",
  "recipients": [
    { "organizationCode": "BANK", "status": "Acknowledged", "referenceNumber": "BANK-77881" }
  ]
}
```

### 6.3 Mock Bank API (ours to build)
Base URL: `http://localhost:4000` (suggested)

**`POST /notify`** (simulates receiving the DNA-02 broadcast)
```json
{
  "sludi": "SLU123456789",
  "dateOfDeath": "2026-08-10",
  "sourceNotificationId": "DN-2026-000001"
}
```
→ `200` (match found): `{ "matched": true, "accountId": "ACC-00123", "status": "ON_HOLD" }`
→ `200` (no match): `{ "matched": false }`

**`GET /accounts`** — list all mock customers for the dashboard.
```json
[
  { "accountId": "ACC-00123", "sludi": "SLU123456789", "name": "John Silva", "balance": 154320.50, "status": "ACTIVE" }
]
```

**Seed data:** a `customers.json` with 3–5 fake accounts, one of which uses the exact SLUDI you'll register a death for in the demo.

## 7. Error handling

- **Form validation** — required fields (name, SLUDI, dateOfDeath, placeOfDeath, district, division, deathNature, personType, reportedBy) must be filled before allowing submit; mirror the API's own `required` list so the government API's `400`/`422` responses are rare, not the primary validation layer.
- **Death not yet Confirmed** when calling `GET /death-notifications/confirmed` → API returns `422`; app should call `/verify` first and not proceed to broadcast until `status: Confirmed`.
- **`BANK` notification not `Acknowledged`** (e.g. `Failed`/`Pending` in response) → don't call our Mock Bank API; log and show "notification failed" state in the Civil Registration App's status trail instead of a false hold.
- **SLUDI not found in mock customer list** → Mock Bank API returns `matched: false`; dashboard shows "no matching account" rather than silently doing nothing, so the demo can also show the "not our customer" path.
- **Auth failures (401/403)** on either real API → surface the error message from `ErrorResponse.errors[].message` directly in the Civil Registration App's UI; don't retry silently.

## 8. 3-hour task breakdown (3 people)

| Time | Health Ministry member | Civil Registration member | Bank member |
|---|---|---|---|
| 0:00–0:20 | Get API subscription + Bearer token for Death Registration/Notification Services (shared task, whoever gets there first shares the token) | Same | Scaffold Mock Bank API project (Express/Flask), stub `/notify` and `/accounts` |
| 0:20–1:00 | Help build/test the Civil Registration App's API calls (steps 2–3) | Scaffold Civil Registration App — build the form (name, NIC, address, DOB, death details per §4.1) and wire submit to `POST /death-registration/register` + `POST /death-registration/verify` | Build `customers.json` seed data (3–5 accounts incl. one matching SLUDI used in demo) |
| 1:00–1:40 | Help test the notification broadcast step | Add `GET /death-notifications/confirmed` + `POST /death-notifications` (steps 4–5) to the app, show status trail in UI | Implement `/notify` matching logic + in-memory/JSON status store |
| 1:40–2:20 | Build the Bank Dashboard UI (can be done by anyone — cross-functional) | Wire Civil Registration App to call Mock Bank `/notify` after `BANK` is `Acknowledged` (step 6) | Build Bank Dashboard UI, wire to `GET /accounts` |
| 2:20–2:50 | Full run-through: fill form → register → confirm → notify → hold → dashboard update | Same | Same — everyone in the same room testing end-to-end |
| 2:50–3:00 | Polish talking points: "real government API, BANK recipient built-in, one simulated step (webhook delivery) called out honestly" | — | — |

## 9. Demo script (~3 minutes)

1. Show the Bank Dashboard: 4 customers, all `ACTIVE`, including "John Silva."
2. Switch to the Civil Registration App: fill in the death form live — name "John Silva", NIC, address, date/place of death, SLUDI matching the seeded bank customer — and submit.
3. App calls Death Registration Services: registration → confirmation → certificate reference number appears in the app's status trail.
4. App calls Death Notification Services, `recipients: ["BANK"]` → the `Acknowledged` response with a bank reference number shows in the app's status trail.
5. App calls our Mock Bank `/notify` → switch to the Bank Dashboard (already open, auto-refreshing) — John Silva's row flips to `ON_HOLD`.
6. *(Optional)* attempt a mock payout via Payments API to the held account, narrate: "in production this would be blocked by the hold flag."
7. Closing line: "This uses Sri Lanka's real Death Notification & Estate Administration API, which already lists banks as a first-class recipient — we're not inventing a data feed, we're completing the government-designed integration."

## 10. Out of scope (explicitly, for the 3-hour window)

- Real bank core-banking integration — this is a mock/demo bank only.
- Handling all 10 recipient types (`PENSION`, `EPF`, etc.) — `BANK` only, mention others exist as a "this generalizes" point.
- Authentication/authorization on our own Civil Registration App or Mock Bank API — no auth needed for local demo services.
- Persisting state beyond the demo session (JSON file or in-memory is fine; no real database).
- UI polish beyond functional forms/tables with clear status — no design system needed.
- Sending NIC, address, or date of birth to Death Registration Services — the real API schema has no such fields; these are captured for the officer's local view only (see §4.1).
- A separate lookup/verification step for NIC or address against any registry — out of scope, not required by the flow.
