# Smart Citizen — Demo Guide

Last updated: 2026-08-19

All links require being on the **same Wi-Fi/LAN** as the host laptop (172.20.9.3). Links only work while the host laptop is on and the servers are running.

---

## Links

| App | URL | Role |
|---|---|---|
| **Apply (Parent)** | http://172.20.9.3:5002 | Parent-facing: SLUDI login, OTP, NIC lookup, pre-registration, finalize + payment |
| **Hospital Desk** | http://172.20.9.3:5001 | Hospital staff: look up a case by reference, add clinical birth details |
| Bank Dashboard *(use case #1, on hold)* | http://172.20.9.3:4000 | Mock bank account dashboard |
| Civil Registration — Death Entry *(use case #1, on hold)* | http://172.20.9.3:5000 | Death registration entry form |

**Primary demo focus: Birth Registration Platform** (Apply + Hospital Desk). Use case #1 (Bereavement Account Hold) is built and working for Register+Verify, but paused — see `build-status-and-sandbox-issue.md`.

---

## Demo flow (Birth Registration Platform)

1. **Apply app** (172.20.9.3:5002) — enter any SLUDI (e.g. `SLU100200300`) → Send OTP → wait ~2s for the simulated "Sending OTP…" → enter the OTP shown on screen (`123456`) → Verify & Continue.
2. Lands on **My Applications** — shows any pending applications for that SLUDI, or empty if new. Click **+ Start New Application**.
3. Enter a **Mother's NIC** (see test data below) → **Retrieve Mother's Details** → real name/DOB/address appears. Optionally enter a **Father's NIC** too.
4. **Submit Pre-Registration** → a 6-digit **Reference Number** is generated. Note it down (or keep this tab open).
5. Switch to **Hospital Desk** (172.20.9.3:5001) — enter the reference number → **Look up case** → Mother's/Father's details show as cards.
6. Fill in Birth Weight, Gender, Birth Date, Birth Time, select a **Hospital** from the dropdown (Hospital ID auto-fills), Ward Number, Physician Name → **Save Clinical Details**.
7. Back in the **Apply app** — go to **My Applications** (or use the same reference under Step 3) → the case now shows status **HOSPITAL_CONFIRMED** → enter the child's name → optionally check **Request courier delivery (Rs. 500)** → **Submit Birth Registration**.
8. If courier was requested, a green **Payment Notification** banner appears at the top showing the real transaction ID. Final status: **REGISTERED**, with a generated RGD Registration Number.

---

## Test data

### Mother / Father NIC (real sandbox data — DRP Identity Data Services)

Any of these 3 can be used for either Mother or Father:

| NIC | Name | Gender | DOB |
|---|---|---|---|
| `736604450V` | Athanayaka Mudiyanselage Lal Senathilake | Male | 10/03/1973 |
| `845231907V` | Madhavi Priyadarshani Perera | Female | 05/11/1984 |
| `901245667V` | Kasun Nadeesha Jayawardena | Male | 17/08/1990 |

Any other NIC will correctly return "not found" — this is real, live sandbox data, not mocked.

### SLUDI (simulated)

Any non-empty value works, e.g. `SLU100200300`. Each distinct SLUDI value has its own "My Applications" list.

### OTP (simulated)

Fixed at **`123456`**, shown on screen after a short delay (simulating SMS delivery — no real SMS gateway in this sandbox).

### Hospitals (dummy list, dropdown in Hospital Desk)

| Name | ID |
|---|---|
| Castle Street Hospital for Women | CWH |
| Lady Ridgeway Hospital for Children | LRH |
| Teaching Hospital Kandy | TH-KDY |
| Teaching Hospital Karapitiya, Galle | TH-GAL |

---

## What's real vs. simulated (say this out loud during judging)

| Piece | Status |
|---|---|
| SLUDI login | Simulated — real SLUDI is a full OIDC flow, too heavy for the build window |
| OTP | Simulated — fixed code, no real SMS gateway in sandbox |
| Mother/Father NIC lookup | **Real** — live call to DRP Identity Data Services (token → agreement → subscription → NIC data) |
| Courier fee payment (Rs. 500) | **Real** — live call to the sandbox Payments API, returns a genuine transaction ID |
| Birth Registration submission | Simulated — the catalog itself labels this API "Conceptual... All endpoints are conceptual," so there's no live backend to call |

---

## If something goes wrong live

- **"NIC not found"** — only the 3 NICs above exist in the sandbox's seed data. Any other value will correctly 404.
- **Payment shows "simulated: true" unexpectedly** — the real Payments API call failed (rare); the app falls back to a clearly-labeled simulated success so the demo doesn't break. Check `app/birth-registration-app` server log if this needs debugging live.
- **Apps unreachable from a teammate's device** — confirm they're on the same Wi-Fi as the host laptop, and that it isn't a client-isolated guest network (some venue Wi-Fi blocks device-to-device traffic even on the same SSID).
- **Server not responding** — restart from the project root:
  ```
  cd app/birth-registration-app && npm start   # port 5001
  cd app/birth-parent-app && npm start          # port 5002
  ```

---

## Repo

Full source, specs, and build notes: https://github.com/buddhika75/smart-citizen-bereavement-hold
