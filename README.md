# Smart Citizen — Automated Bereavement Account Hold

Team Smart Citizen's build for the Sri Lanka DPI Developer Portal Sandbox HandsOn Build Day.

## What this is

When a person dies, banks often keep paying out to their accounts because there's no automated link between Civil Registration and the bank. This project notifies a bank of a confirmed death via Sri Lanka's real Death Registration & Death Notification Services sandbox APIs, so the account can be placed on hold automatically.

## Docs

- [`use-cases.md`](use-cases.md) — candidate use cases considered
- [`spec-case-1-bereavement-account-hold.md`](spec-case-1-bereavement-account-hold.md) — full technical spec for the selected use case
- [`team-master.md`](team-master.md) — team/event/build status, kept up to date
- [`build-status-and-sandbox-issue.md`](build-status-and-sandbox-issue.md) — what's built, and a sandbox bug found and flagged to the DPI team

## Apps

- [`app/civil-registration-app/`](app/civil-registration-app) — death entry form; calls the real Death Registration & Death Notification Services
- [`app/bank-api/`](app/bank-api) — mock bank API + live dashboard; receives the notification and places the matching account on hold

## Running locally

Each app is a small Node/Express server. See each app's folder for setup — both need `npm install`, and `civil-registration-app` needs a `.env` (copy `.env.example`) with real sandbox credentials from [My Applications](https://stg.devportal.gov.lk/my-applications).

```
cd app/bank-api && npm install && npm start          # http://localhost:4000
cd app/civil-registration-app && npm install && npm start   # http://localhost:5000
```
