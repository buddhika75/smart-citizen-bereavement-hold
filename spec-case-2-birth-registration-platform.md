# Spec — Birth Registration Platform (Use Case #2)

**Status:** Active build (replaces Use Case #1 as the team's demo focus, per GovTech confirming the Death Notification sandbox bug won't be fixed today)
**Source:** `Birth Registration Platform.docx.md`

## 1. Problem

A parent must apply for a birth certificate. Today this is manual and disconnected between the hospital (who knows clinical birth facts) and the Registrar General's Department (who issues the certificate). This platform links: applicant pre-registration → hospital clinical data entry → applicant finalization + optional paid courier service → registration submission.

## 2. What's real vs. mocked (checked against the live catalog 2026-08-19)

| Piece | Catalog API | Status | Decision |
|---|---|---|---|
| SLUDI account/login | #68 SLUDI | Real, but full OIDC/OAuth flow (14 endpoints) | **Mocked** — accept any non-empty SLUDI string as "logged in" |
| Mother/Father NIC lookup | #16 DRP Identity Data Services | Real, but requires org token → agreement ID → subscription ID chain; sandbox sample shows `"agreements": []` (likely empty for our org) | **Mocked** — pre-seeded demo records, same response shape as the real API |
| Value-added courier service payment (Rs. 500) | #39 Payments | **Real, proven working** (used in Use Case #1) | **Real API call** |
| Birth Registration submission | #3 Birth Registration | Catalog explicitly labels it **"Conceptual API specification... All endpoints are conceptual"** — not a live callable backend | **Mocked** — same request/response JSON shape as the docs, so swapping in a real implementation later is a client swap only |

This mirrors the honesty approach from Use Case #1: real APIs are called for real; anything not truly live in the sandbox is clearly labeled as simulated in the UI, not hidden.

## 3. Architecture

Single Node/Express app, `app/birth-registration-app/`, port 5001, one in-memory case store keyed by a 6-digit reference number.

```
Applicant (Apply view)                         Hospital Desk view              Applicant (Apply view, resumed)
  │                                                   │                               │
  ├─ enter SLUDI (mock, any string)                   │                               │
  ├─ enter mother NIC → mock lookup                   │                               │
  ├─ enter father NIC → mock lookup (optional)         │                               │
  ├─ generate 6-digit reference ───────────────────────┼──────────────────────────────┤
  │                                                   ├─ look up by reference          │
  │                                                   ├─ enter weight, gender, DOB,    │
  │                                                   │   hospital id/name, ward,      │
  │                                                   │   physician name               │
  │                                                   ├─ save (status → Hospital       │
  │                                                   │   Confirmed)                   │
  │                                                                                    ├─ look up by reference
  │                                                                                    ├─ enter child's name
  │                                                                                    ├─ opt-in courier service?
  │                                                                                    │    yes → REAL Payments API
  │                                                                                    │    (Rs. 500, POST /api/sandbox/initiate)
  │                                                                                    ├─ submit → MOCK Birth Registration API
  │                                                                                    │    (POST /v1/births/notifications shape)
  │                                                                                    └─ status → Registered, shows
  │                                                                                        rgdRegistrationNumber
```

## 4. Components

- **`sludiMock.js`** — `validateSludi(value)`: non-empty string check only. No real OIDC call.
- **`nicLookup.js`** — `lookupNic(nic)`: pre-seeded map of 2-3 demo NICs → name/DOB/address, matching the real API's response field names (`fullNameEnglish`, `dateOfBirth`, `addressLine1English`, etc.). Unknown NIC → `{ found: false }`.
- **`caseStore.js`** — `createCase(...)`, `getCase(ref)`, `updateHospitalDetails(ref, ...)`, `finalizeCase(ref, ...)`. Generates 6-digit reference, tracks a status trail array (mirrors `accountStore.js` / civil-registration `cases` pattern).
- **`paymentsClient.js`** — real HTTP client to the Payments API (`https://gateway.stg.devportal.gov.lk/payments/...`), reusing the `X-DIS-API-KEY`/`X-DIS-CLIENT-ID` auth pattern. Requires a new sandbox application subscribed to Payments (or reuse existing bereavement app's Payments subscription if credentials are shared — TBD at build time).
- **`birthRegistrationMock.js`** — `submitBirthRegistration(payload)`: returns `{ notificationId, status: 'SUBMITTED_TO_RGD', message, timestamp }` then a synthesized `rgdRegistrationNumber` — matching the two real (but conceptual) endpoint shapes from the catalog docs.
- **`public/`** — three simple views:
  - `/apply` — pre-registration form + (later) name-child/payment form, looked up by reference
  - `/hospital` — clinical data entry form, looked up by reference
  - `/status/:ref` (or a lookup box) — status trail display

## 5. Data captured (per the source doc)

**Pre-registration (Function 2):** SLUDI, Mother NIC, Father NIC (optional)
**Hospital (Function 3):** birth weight, gender, birth date, hospital ID, hospital name, ward number, physician name — keyed by reference number
**Finalization (Function 4):** SLUDI (re-entered), child's first/middle/surname, courier service opt-in (Rs. 500)

## 6. UI transparency

- Hospital view and the final Registration step both carry a visible badge: **"Simulated — Birth Registration API is conceptual in this sandbox."**
- The payment step carries a **"✓ Real sandbox API call (Payments)"** badge when it's used.

## 7. Task breakdown (3 people, ~3 hours)

| Role | Tasks |
|---|---|
| Civil Registration / Hospital | Hospital Desk view + `caseStore.js` hospital-update logic, unit tests |
| Health Ministry | Apply view (both stages) + `sludiMock.js` + `nicLookup.js`, unit tests |
| Bank / Payments | `paymentsClient.js` integration + `birthRegistrationMock.js`, register new sandbox app if needed, status view |

## 8. Out of scope

- Real SLUDI OIDC login
- Real NIC data retrieval (agreement/subscription provisioning)
- Real Birth Registration submission (sandbox has no live backend for it)
- Multi-birth (twins/triplets) handling — doc mentions it, single-child only for the demo
