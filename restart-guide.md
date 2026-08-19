# Restart Guide (Demo Day Only)

If the laptop restarts or the servers stop, run this to get the demo back up. This is a throwaway MVP for one demo — not meant to survive past the event.

## Start all 4 apps

Open 4 terminals (or run each with `&` / background), one per app, from the project root:

```
cd app/bank-api && npm start                  # http://localhost:4000
cd app/civil-registration-app && npm start     # http://localhost:5000
cd app/birth-registration-app && npm start     # http://localhost:5001
cd app/birth-parent-app && npm start            # http://localhost:5002
```

If `node_modules` is missing in any folder, run `npm install` there first.

## Required `.env` files

Each of these 3 apps needs a `.env` (copy from `.env.example` in the same folder, then fill in real values):

- `app/civil-registration-app/.env` — needs `DIS_CLIENT_ID` / `DIS_API_KEY` from the portal's **My Applications** page (app: "Smart Citizen - Bereavement Account Hold")
- `app/birth-registration-app/.env` — same `DIS_CLIENT_ID` / `DIS_API_KEY`, plus `PAYMENTS_MERCHANT_ID=merch_5f8a9d2c`
- `app/birth-parent-app/.env` — set `BACKEND_URL` to this laptop's **current LAN IP** + `:5001` (e.g. `http://172.20.9.3:5001`) — check with `ipconfig`, the IP may change after a reboot

`app/bank-api` needs no `.env`.

## Check the LAN IP hasn't changed

```
ipconfig
```
Look for the Wi-Fi adapter's IPv4 address. If it changed from `172.20.9.3`:
1. Update `BACKEND_URL` in `app/birth-parent-app/.env` to the new IP
2. Give teammates the new links (same ports: 4000, 5000, 5001, 5002)

## Demo links and flow

See `demo-guide.md` for the full walkthrough, test NIC numbers, fixed OTP, and hospital list.

## If the sandbox auth breaks (401/403 errors)

The DIS API key may need rotating from **My Applications → Smart Citizen - Bereavement Account Hold → Edit**. Use the portal's "Copy Key" button (not reading it off a screenshot — that caused a bad key once before) and update both `.env` files that use it.
