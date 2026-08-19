# Smart Citizen — Candidate Use Cases

Source: [Sri Lanka DPI Developer Portal API Catalog](https://stg.devportal.gov.lk/api-catalog) (staging, 71 APIs).
Constraint: at least one catalog API, must solve a real problem, buildable in ~3 hours.
Team domains: Health Ministry, Civil Registration, Bank.

---

## 1. Automated Bereavement Account Hold (Civil Registration + Bank) — ⭐ Recommended

**Problem solved:** banks and G2P schemes keep paying out to accounts belonging to deceased people because death registration and bank records are disconnected — a known source of fraud/leakage.

**Flow:** Civil Registration registers a death → a bank-side poller checks for newly confirmed deaths → matching account is flagged/held in a small mock bank dashboard.

**APIs used:**
- Death Registration Services — `POST /death-registration/register`, `POST /death-registration/verify`, `GET /death-record`
  Base URL: `https://sgateway.stg.devportal.gov.lk/death-registration-services-v1-0-0`
- Death Notification Services — `GET /death-notifications/confirmed`, `POST /death-notifications`
  Base URL: `https://sgateway.stg.devportal.gov.lk/death-notification-services-v1-0-0`
- Payments (bank) — `POST /api/sandbox/initiate` (used to demo a blocked/declined payout as a stand-in for "account is held")
  Base URL: `https://sgateway.stg.devportal.gov.lk/payments`

**Update:** Death Notification Services' `POST /death-notifications` (DNA-02) is a real multi-agency broadcast API — `recipients` accepts `BANK` directly, alongside `PENSION`, `EPF`, `ETF`, `WBB`, `INSURANCE`, `IRD`, `CEB`, `WATER_BOARD`, `TELCO`, and returns a per-recipient `Acknowledged`/`Failed`/`Pending` status with a reference number. No polling needed — this is the intended use of the API. One simplification remains: the sandbox only returns a synchronous acknowledgment; it doesn't actually deliver to a real bank webhook, so our own Mock Bank API's `/notify` endpoint is called directly right after `BANK` comes back `Acknowledged`, standing in for that delivery. See `spec-case-1-bereavement-account-hold.md` for the full spec.

**Why recommended:** tightest scope, real/live sandbox endpoints (not "conceptual" specs) with `BANK` as a first-class recipient already designed in, solves a well-known and explainable problem, easy 3-hour build and demo.

---

## 2. Cause-of-Death-Verified Certificate Issuance (Health + Civil Registration)

**Problem solved:** delay and data-entry errors between a hospital certifying cause of death and Civil Registration issuing the death certificate.

**Flow:** Health Ministry submits cause of death via the Cause of Death Verification API → Civil Registration's Death Registration Services consumes/pre-fills a death certificate instead of manual re-entry.

**APIs used:**
- Cause of Death Verification for Death Certificate Issuance (Health Ministry, conceptual, 3 endpoints)
- Death Registration Services — `POST /death-registration/register`, `POST /death-registration/verify`

**Caveat:** the Cause of Death API is marked "conceptual" in the catalog — verify it has real sandbox endpoints before committing to this option.

---

## 3. Newborn Instant Benefits Enrollment (Health/Civil Registration + Bank)

**Problem solved:** parents currently must separately apply for a child welfare/benefit grant after registering a birth — two bureaucratic steps instead of one.

**Flow:** Birth Registration triggers an automatic bank grant deposit via the Payments API.

**APIs used:**
- Birth Registration — Birth Registration and Notification API (2 endpoints)
- Payments — `POST /api/sandbox/initiate`

---

## 4. Three-Domain Chain: Birth → Health ID → Bank Grant

**Problem solved:** same as #3, but also demonstrates identity issuance across all three domains in one flow.

**Flow:** Birth Registration → auto-generates a health client ID via eKYC for Health Client Registration → triggers a one-time bank grant payment.

**APIs used:**
- Birth Registration
- eKYC for Health Client Registration (Citizen/Foreigners) — Health Ministry, conceptual, 3 endpoints
- Payments — `POST /api/sandbox/initiate`

**Caveat:** most moving parts of the four options; higher risk for a 3-hour window. eKYC API is also "conceptual" — verify real endpoints exist before relying on it.

---

## Decision status

Not yet finalized. Leading candidate: **#1 (Bereavement Account Hold)**.
