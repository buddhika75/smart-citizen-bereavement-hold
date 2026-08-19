# Smart Citizen

Team Smart Citizen's build for the Sri Lanka DPI Developer Portal Sandbox HandsOn Build Day.

## What this is

Two use cases explored against the real Sri Lanka DPI Developer Portal sandbox:

1. **Automated Bereavement Account Hold** (on hold) — notifies a bank of a confirmed death via Death Registration & Death Notification Services, so the account can be placed on hold automatically. Paused: the sandbox has a data-isolation bug between the two APIs that GovTech confirmed won't be fixed during the event.
2. **Birth Registration Platform** (active build) — links an applicant pre-registration, hospital clinical data entry, and final registration + optional paid courier service, per the team's own use-case doc. The sandbox's Birth Registration API is catalog-labeled "conceptual" (no live backend), so registration itself is simulated; the courier-fee payment is a real sandbox Payments API call.

## Docs

- [`use-cases.md`](use-cases.md) — candidate use cases considered
- [`spec-case-1-bereavement-account-hold.md`](spec-case-1-bereavement-account-hold.md) — full technical spec for use case #1
- [`spec-case-2-birth-registration-platform.md`](spec-case-2-birth-registration-platform.md) — full technical spec for use case #2 (active)
- [`team-master.md`](team-master.md) — team/event/build status, kept up to date
- [`build-status-and-sandbox-issue.md`](build-status-and-sandbox-issue.md) — what's built, and a sandbox bug found and flagged to the DPI team

## Apps

- [`app/civil-registration-app/`](app/civil-registration-app) — death entry form; calls the real Death Registration & Death Notification Services (use case #1)
- [`app/bank-api/`](app/bank-api) — mock bank API + live dashboard; receives the notification and places the matching account on hold (use case #1)
- [`app/birth-registration-app/`](app/birth-registration-app) — Apply/Hospital Desk views for the Birth Registration Platform; real Payments API call for the courier fee (use case #2)

## Running locally

Each app is a small Node/Express server. See each app's folder for setup — all need `npm install`, and `civil-registration-app` / `birth-registration-app` need a `.env` (copy `.env.example`) with real sandbox credentials from [My Applications](https://stg.devportal.gov.lk/my-applications).

```
cd app/bank-api && npm install && npm start                   # http://localhost:4000
cd app/civil-registration-app && npm install && npm start     # http://localhost:5000
cd app/birth-registration-app && npm install && npm start     # http://localhost:5001
```
