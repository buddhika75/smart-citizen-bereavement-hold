# Smart Citizen — Team Master Document

> Living document. Update as details are confirmed — replace TBD placeholders in place, don't duplicate sections.

Last updated: 2026-08-19

---

## Event

- **Event name:** TBD
- **Date(s):** TBD
- **Venue / format:** TBD (referenced source doc: `API Catalog - Sandbox HandsOn Build Day.pdf`, suggests a hands-on build day)
- **Time budget:** 3 hours (per team constraint)

## Team

- **Team name:** Smart Citizen

| Name | Domain / Dept | Role in team | Contact |
|---|---|---|---|
| Dr. M H B Ariyaratne | Ministry of Health | TBD | buddhika.ari@gmail.com |
| TBD | Civil Registration Dept | TBD | TBD |
| TBD | Bank | TBD | TBD |

## Represented domains

- Health Ministry
- Civil Registration Department
- Bank (name TBD)

## Environment

- **Portal:** [Sri Lanka DPI Developer Portal — API Catalog](https://stg.devportal.gov.lk/api-catalog) (staging)
- **Login account used:** buddhika.ari@gmail.com (Dr. M H B Ariyaratne)
- **API subscription tier:** Tier 1 - Explorer (0/3,000 points used, as of 2026-08-19)

## Use case

- Candidate use cases: see `use-cases.md`
- **Selected: #1, Automated Bereavement Account Hold** (Civil Registration + Bank)
- Full technical spec: `spec-case-1-bereavement-account-hold.md`

## Build plan

- See `spec-case-1-bereavement-account-hold.md` §8 for the 3-hour task breakdown (3 people: Health Ministry, Civil Registration, Bank)
- Three apps: **Civil Registration App** (death entry form: name, NIC, address, death details) → **Death Registration/Notification Services** (real government APIs, `POST /death-notifications` with `recipients: ["BANK"]`) → **Mock Bank API** (`/notify`) → **Bank Dashboard** shows account flip to `ON_HOLD`
- NIC/address are captured in the Civil Registration App for local display only — the real API schema has no such fields, so they are not transmitted (see spec §4.1)

## Open questions / risks

- Death Notification Services' `POST /death-notifications` only returns a synchronous acknowledgment in the sandbox — it doesn't actually deliver to a real bank webhook. Our trigger script calls our own Mock Bank API directly as a stand-in; call this out honestly during judging.
- Several Health Ministry APIs (e.g. Cause of Death Verification, eKYC for Health Client Registration) are marked "conceptual" in the catalog — not used by the selected use case, but worth flagging if considered later.

## Build status

- Two working local apps built and tested against the real sandbox: `app/bank-api/` (Mock Bank API + dashboard) and `app/civil-registration-app/` (death entry form). Both have passing unit tests (TDD).
- **Blocked on a sandbox bug**, not our code: Death Notification Services can't see records created via Death Registration Services (separate/disconnected datasets in staging). Registration + confirmation work end-to-end with real certificate numbers; the `BANK` broadcast step 404s on any freshly-created record.
- Full findings and evidence: `build-status-and-sandbox-issue.md`. Flagging to the sandbox team at the event per plan — holding further workaround work until then.

## Change log

- 2026-08-19 — Initial document created. Catalog explored (71 APIs across 12 building blocks). Use case options drafted in `use-cases.md`.
- 2026-08-19 — Use case #1 selected. Pulled live OpenAPI specs for Death Registration Services, Death Notification Services, and Payments. Found Death Notification Services already broadcasts to `BANK` as a built-in recipient — replaced the earlier polling idea with this real flow. Full spec written to `spec-case-1-bereavement-account-hold.md`.
- 2026-08-19 — Added a real Civil Registration App (death entry form with name, NIC, address, etc.) to the spec, replacing the earlier trigger-script approach. Only fields the real Death Registration Services API accepts are transmitted; NIC/address are local-display-only.
- 2026-08-19 — Built and tested `app/bank-api/` and `app/civil-registration-app/` locally against the real sandbox (registered a portal application, resolved auth-header and IP-whitelist issues). Found and documented a sandbox data-isolation bug between Death Registration and Death Notification Services — see `build-status-and-sandbox-issue.md`. Decision: hold, flag to sandbox team at the event, don't build further workarounds yet.
