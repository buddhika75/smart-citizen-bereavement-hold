const fetch = require('node-fetch');

const DRP_BASE = process.env.DRP_BASE_URL
  || 'https://gateway.stg.devportal.gov.lk/drp-identity-data-services-v1-0-0/v1.0.0';

function disHeaders() {
  const apiKey = process.env.DIS_API_KEY;
  const clientId = process.env.DIS_CLIENT_ID;
  if (!apiKey || !clientId) {
    throw new Error('DIS_API_KEY and DIS_CLIENT_ID must be set in .env (see .env.example)');
  }
  return { 'X-DIS-API-KEY': apiKey, 'X-DIS-CLIENT-ID': clientId };
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

let cachedToken = null;
let cachedSubscriptionId = null;

async function getOrgToken() {
  if (cachedToken) return cachedToken;
  const res = await fetch(`${DRP_BASE}/public/oauth/org/token`, {
    method: 'POST',
    headers: { ...disHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.DRP_USERNAME || 'egnadmin',
      password: process.env.DRP_PASSWORD || 'Drp@321#',
      clientId: process.env.DRP_ORG_CLIENT_ID || 'ORG00760',
      clientSecret: process.env.DRP_ORG_CLIENT_SECRET || 'kK4CcXrYfdeGLw6wjYaMuVW4eINczT'
    })
  });
  const body = await parseJsonOrThrow(res, 'DRP org token');
  cachedToken = body.data.accessToken;
  return cachedToken;
}

async function getSubscriptionId(token) {
  if (cachedSubscriptionId) return cachedSubscriptionId;
  const agreementsRes = await fetch(`${DRP_BASE}/adminservice/org/agreements/user`, {
    headers: { ...disHeaders(), Authorization: `Bearer ${token}` }
  });
  const agreementsBody = await parseJsonOrThrow(agreementsRes, 'DRP agreements lookup');
  const agreementId = agreementsBody.data.agreements[0]?.agreementId;
  if (!agreementId) {
    throw new Error('No agreements found for this organization');
  }

  const subsRes = await fetch(`${DRP_BASE}/adminservice/org/subscription/agreement/${agreementId}`, {
    headers: { ...disHeaders(), Authorization: `Bearer ${token}` }
  });
  const subsBody = await parseJsonOrThrow(subsRes, 'DRP subscription lookup');
  const subscriptionId = subsBody.data.subscriptions[0]?.subscriptionId;
  if (!subscriptionId) {
    throw new Error('No subscriptions found for this agreement');
  }
  cachedSubscriptionId = subscriptionId;
  return cachedSubscriptionId;
}

async function lookupNic(nic) {
  const token = await getOrgToken();
  const subscriptionId = await getSubscriptionId(token);

  const res = await fetch(`${DRP_BASE}/request-handlerservice/org/request`, {
    method: 'POST',
    headers: { ...disHeaders(), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriptionId, keys: { nic }, consent: true })
  });

  if (res.status === 400 || res.status === 404) {
    return { found: false };
  }
  const body = await parseJsonOrThrow(res, 'NIC lookup');
  return { found: true, data: body.data };
}

module.exports = { lookupNic };
