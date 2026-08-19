require('dotenv').config();
const express = require('express');
const path = require('node:path');
const fetch = require('node-fetch');
const { toRegisterDeathPayload } = require('./mapFormToApi');
const gov = require('./govApiClient');

const PORT = process.env.PORT || 5000;
const BANK_API_BASE_URL = process.env.BANK_API_BASE_URL || 'http://localhost:4000';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory record of cases submitted this session, for the local
// "Registered Deaths" list. Includes NIC/address/DOB for display only —
// none of that is sent to the government API (see mapFormToApi.js).
const cases = [];

app.get('/cases', (req, res) => {
  res.json(cases);
});

app.post('/register-death', async (req, res) => {
  const form = req.body || {};
  const caseRecord = {
    id: `local-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    form,
    steps: []
  };
  cases.unshift(caseRecord);

  const addStep = (name, ok, detail) => {
    caseRecord.steps.push({ name, ok, detail, at: new Date().toISOString() });
  };

  try {
    const registerPayload = toRegisterDeathPayload(form);
    const registerResult = await gov.registerDeath(registerPayload);
    addStep('Registered', true, registerResult);
    caseRecord.deathRegistrationId = registerResult.deathRegistrationId;

    const verifyResult = await gov.verifyDeath({
      deathRegistrationId: registerResult.deathRegistrationId,
      actorType: 'MedicalOfficer',
      actorId: form.reportedBy,
      status: 'Confirmed',
      causeOfDeath: form.causeOfDeath || 'Not specified',
      investigationRequired: false,
      awaitingInformation: false,
      requiredDocuments: [],
      remarks: 'Confirmed via Smart Citizen Civil Registration App demo.'
    });
    addStep('Confirmed', true, verifyResult);
    caseRecord.certificateReferenceNo = verifyResult.certificateReferenceNo;

    // Sandbox limitation, confirmed by direct testing: Death Notification
    // Services and Death Registration Services are backed by separate mock
    // datasets, so a deathRegistrationId just created via /register is not
    // visible to GET /death-notifications/confirmed (404 even though the
    // record is genuinely Confirmed on the registration side). We still
    // attempt the lookup for transparency in the status trail, but don't
    // block the flow on it — the broadcast itself only needs data we
    // already have from the register/verify steps.
    let confirmed = { deathRegistrationId: registerResult.deathRegistrationId, sludi: registerPayload.sludi, dateOfDeath: registerPayload.dateOfDeath };
    try {
      const confirmedLookup = await gov.getConfirmedDeath({ deathRegistrationId: registerResult.deathRegistrationId });
      confirmed = confirmedLookup;
      addStep('Fetched confirmed record', true, confirmedLookup);
    } catch (lookupErr) {
      addStep('Fetched confirmed record', false, {
        message: lookupErr.message,
        note: 'Sandbox limitation: Death Notification Services has a separate mock dataset from Death Registration Services. Proceeding with data from the register/verify steps.'
      });
    }

    const notifyResult = await gov.broadcastDeathNotification({
      notificationId: `DN-${Date.now()}`,
      deathRegistrationId: confirmed.deathRegistrationId,
      sludi: confirmed.sludi,
      dateOfDeath: confirmed.dateOfDeath,
      recipients: ['BANK'],
      notificationDateTime: new Date().toISOString()
    });
    addStep('Bank notified', true, notifyResult);

    const bankRecipient = notifyResult.recipients?.find(r => r.organizationCode === 'BANK');
    if (bankRecipient && bankRecipient.status === 'Acknowledged') {
      // Sandbox limitation: the government API only returns a synchronous
      // acknowledgment — it does not actually deliver to a bank webhook.
      // We call our own Mock Bank API directly to simulate that delivery.
      const bankRes = await fetch(`${BANK_API_BASE_URL}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sludi: confirmed.sludi,
          dateOfDeath: confirmed.dateOfDeath,
          sourceNotificationId: notifyResult.notificationId
        })
      });
      const bankResult = await bankRes.json();
      addStep('Bank account hold', bankResult.matched === true, bankResult);
    } else {
      addStep('Bank account hold', false, { skipped: true, reason: 'BANK recipient not Acknowledged' });
    }

    caseRecord.status = 'complete';
    res.json(caseRecord);
  } catch (err) {
    caseRecord.status = 'error';
    addStep('Error', false, { message: err.message, body: err.body });
    res.status(err.status || 500).json(caseRecord);
  }
});

app.listen(PORT, () => {
  console.log(`Smart Citizen Civil Registration App listening on http://localhost:${PORT}`);
});
