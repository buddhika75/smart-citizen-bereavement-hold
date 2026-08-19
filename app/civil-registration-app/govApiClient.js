const fetch = require('node-fetch');

// Real sandbox gateway hosts, confirmed from the DPI Developer Portal
// Playground "Try Out" tab (differs slightly from the catalog doc page,
// which shows "sgateway" without the /v1.0.0 version suffix).
const DEATH_REG_BASE = process.env.DEATH_REG_BASE_URL
  || 'https://gateway.stg.devportal.gov.lk/death-registration-services-v1-0-0/v1.0.0';
const DEATH_NOTIF_BASE = process.env.DEATH_NOTIF_BASE_URL
  || 'https://gateway.stg.devportal.gov.lk/death-notification-services-v1-0-0/v1.0.0';

function authHeaders() {
  const apiKey = process.env.DIS_API_KEY;
  const clientId = process.env.DIS_CLIENT_ID;
  if (!apiKey || !clientId) {
    throw new Error('DIS_API_KEY and DIS_CLIENT_ID must be set in .env (see .env.example)');
  }
  return {
    'Content-Type': 'application/json',
    'X-DIS-API-KEY': apiKey,
    'X-DIS-CLIENT-ID': clientId
  };
}

async function parseJsonOrThrow(res, context) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.errors?.[0]?.message || body?.message || res.statusText;
    const err = new Error(`${context} failed (${res.status}): ${message}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function registerDeath(payload) {
  const res = await fetch(`${DEATH_REG_BASE}/death-registration/register`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJsonOrThrow(res, 'Register death');
}

async function verifyDeath(payload) {
  const res = await fetch(`${DEATH_REG_BASE}/death-registration/verify`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJsonOrThrow(res, 'Verify death');
}

async function getConfirmedDeath({ deathRegistrationId }) {
  const url = `${DEATH_NOTIF_BASE}/death-notifications/confirmed?deathRegistrationId=${encodeURIComponent(deathRegistrationId)}`;
  const res = await fetch(url, { headers: authHeaders() });
  return parseJsonOrThrow(res, 'Get confirmed death');
}

async function broadcastDeathNotification(payload) {
  const res = await fetch(`${DEATH_NOTIF_BASE}/death-notifications`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJsonOrThrow(res, 'Broadcast death notification');
}

module.exports = { registerDeath, verifyDeath, getConfirmedDeath, broadcastDeathNotification };
