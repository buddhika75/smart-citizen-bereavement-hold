const fetch = require('node-fetch');

const PAYMENTS_BASE = process.env.PAYMENTS_BASE_URL
  || 'https://gateway.stg.devportal.gov.lk/payments/v1.0.0';

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

async function initiateCourierPayment({ reference, firstName, lastName }) {
  const payload = {
    merchant_id: process.env.PAYMENTS_MERCHANT_ID || 'merch_5f8a9d2c',
    amount: 500.0,
    currency: 'LKR',
    notify_url: 'http://localhost:5001/api/payment-webhook',
    return_url: 'http://localhost:5001/apply',
    metadata: {
      first_name: firstName || 'Applicant',
      last_name: lastName || 'Guardian',
      email: 'applicant@example.com',
      reference
    }
  };

  try {
    const res = await fetch(`${PAYMENTS_BASE}/api/sandbox/initiate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body?.message || res.statusText);
    }
    return {
      simulated: false,
      transactionId: body?.data?.transaction_id,
      redirectUrl: body?.data?.redirect_url,
      raw: body
    };
  } catch (err) {
    return {
      simulated: true,
      transactionId: `SIM-${reference}`,
      note: `Real Payments API call failed (${err.message}) — showing a simulated success so the demo can continue.`
    };
  }
}

module.exports = { initiateCourierPayment };
