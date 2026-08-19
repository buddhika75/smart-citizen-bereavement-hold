# Build Status & Sandbox Issue Report

**Team:** Smart Citizen
**Use case:** #1, Automated Bereavement Account Hold
**Date:** 2026-08-19
**Spec:** `spec-case-1-bereavement-account-hold.md`

---

## 1. What's built

Two working Node/Express apps under `app/`, both running locally and tested against the real DPI Sandbox APIs (not mocked on our side):

### `app/bank-api/` — Mock Bank API + Dashboard
- `accountStore.js` — in-memory account matching/hold logic, fully unit tested (5/5 tests passing, TDD).
- `server.js` — Express server exposing `GET /accounts` and `POST /notify`.
- `public/index.html` — live-refreshing dashboard showing customer accounts and status (`ACTIVE` / `ON_HOLD`).
- `customers.json` — 4 seeded demo customers, including `SLU123456` (John Silva) matching the Death Registration Services API's own documented example.
- **Verified working:** `POST /notify` with a matching SLUDI correctly flips the account to `ON_HOLD` with a reason, timestamp, and source notification ID. Confirmed idempotent (re-notifying doesn't create duplicate holds).

### `app/civil-registration-app/` — Death Entry Form
- `mapFormToApi.js` — maps the officer's form (name, NIC, address, DOB, death details) to the exact payload shape Death Registration Services accepts. Fully unit tested (5/5 tests passing, TDD). **Confirmed: NIC, address, and date of birth are never sent to the government API** — the real schema has no such fields; they're kept only in the app's local "Registered Deaths" list, with an explicit note in the UI saying so.
- `govApiClient.js` — real HTTP client for Death Registration Services and Death Notification Services, using the confirmed sandbox auth headers (`X-DIS-API-KEY`, `X-DIS-CLIENT-ID`).
- `server.js` — orchestrates the full flow: register → verify/confirm → (attempt) fetch confirmed record → broadcast to `BANK` → call our Mock Bank API.
- `public/index.html` — the officer-facing form with a live status trail (Registered → Confirmed → Bank Notified → Account Held) and a session list of submitted cases.

### Sandbox application registered
- Portal application **"Smart Citizen - Bereavement Account Hold"** created under this account, subscribed to Death Registration Services, Death Notification Services, and Payments.
- Client ID: `cid_16dc8a5e-a83d-49e0-9879-5e4f2326bc17`
- Real auth confirmed working end-to-end (see §2) once the IP whitelist was corrected to match the outbound gateway IP.

## 2. Verified working, end-to-end, against the real sandbox

Live test run (2026-08-19, ~07:21 UTC), person "Kamala Perera":

1. `POST /death-registration/register` → **201**, `deathRegistrationId: DR005`
2. `POST /death-registration/verify` (`status: Confirmed`) → **200**, `certificateReferenceNo: DC-2026-COL-129215`, `certificateGenerated: true`

Both steps work exactly as documented, producing a real certificate reference number from the sandbox.

## 3. Sandbox bug found — blocks the rest of the flow

**Finding:** Death Registration Services and Death Notification Services are backed by **separate, disconnected datasets** in the sandbox. A death registered and confirmed via Death Registration Services is invisible to Death Notification Services — both the lookup and the broadcast call fail.

**Evidence:**

| Call | Input | Result |
|---|---|---|
| `GET /death-notifications/confirmed?deathRegistrationId=DR005` (just registered via `/register` + `/verify`, confirmed `Confirmed` status) | `DR005` | `404 DNA-404-001` — "No death record found" |
| `GET /death-notifications/confirmed?sludi=SLU223456789` (the SLUDI used in the same registration) | `SLU223456789` | `404 DNA-404-001` — same error |
| `GET /death-notifications/confirmed?deathRegistrationId=DR-2026-001245` (the **example ID published in the Death Notification Services API docs**, not created by us) | `DR-2026-001245` | **200 OK** — returns a valid confirmed record |
| `POST /death-notifications` (broadcast) using our real `deathRegistrationId: DR006` | — | `404 DNA-404-001` — same error, even on the broadcast call itself, not just the read |

**Conclusion:** this isn't an auth, IP whitelist, or client-code issue (all of which we hit and resolved separately — see §4). Death Notification Services' backing store appears to be a fixed/static demo dataset that doesn't include records newly created through Death Registration Services, even though both APIs are published by the same team (Registrar General's Department IT Integration Team) and share the same `deathRegistrationId`/`sludi` field conventions.

**Impact on our use case:** the core integration point of Automated Bereavement Account Hold — "broadcast a real, freshly-registered death to `BANK`" — cannot currently be demonstrated end-to-end using freshly created data. The Mock Bank side (our own code) works correctly; the gap is entirely on the government sandbox's Notification Service.

**Status:** flagging to the sandbox team, per plan — they'll be at the event and can advise (a fix, a different test dataset, or confirmation this is expected/known).

## 4. Other issues hit and resolved along the way (informational, not blockers)

- **Auth header format** isn't `Authorization: Bearer <token>` as initially assumed from the API docs alone — it's two custom headers: `X-DIS-API-KEY` and `X-DIS-CLIENT-ID`. Found via the Playground's "Authorize" dialog, not the OpenAPI spec text.
- **Gateway host differs from the catalog's documented Base URL.** The catalog's "Base URL" field shows `https://sgateway.stg.devportal.gov.lk/...` but the real working host (confirmed via Playground) is `https://gateway.stg.devportal.gov.lk/...` with an added `/v1.0.0` version suffix.
- **IP Whitelist is mandatory** when creating a sandbox application and only accepts plain IPv4 addresses (no CIDR ranges like `0.0.0.0/0`). Our actual outbound request IP (`192.168.2.1`) didn't match what we guessed (`127.0.0.1`); had to add it via the app's Edit flow after the first 403.
- **API key is shown once.** First key had a transcription error when read visually from a screenshot; fixed by using "Rotate API Key" and reading the value from the clipboard (via the Copy button) instead of visually.

## 5. Not yet exercised

- Mock Bank API `/notify` call from within the Civil Registration App's own orchestration (the piece that depends on the broadcast succeeding first) — blocked by §3.
- Payments API (`POST /api/sandbox/initiate`) — optional/illustrative step in the spec, not yet touched.
- Dashboard visual confirmation of a live end-to-end hold triggered by the real form (bank-api's `/notify` has been tested directly, and works — see §1).

## 6. Suggested question for the sandbox team

> "Are Death Registration Services and Death Notification Services expected to share the same underlying dataset in the staging sandbox? We can register and confirm a death (getting a real certificate reference number), but Death Notification Services returns 404 for that same `deathRegistrationId`/`sludi` on both the confirmed-lookup and the broadcast endpoint — while the example ID from your own API docs (`DR-2026-001245`) does resolve successfully."
