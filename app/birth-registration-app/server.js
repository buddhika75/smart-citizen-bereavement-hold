require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { createCaseStore } = require('./caseStore');
const { lookupNic } = require('./nicClient');
const { validateSludi } = require('./sludiMock');
const { requestOtp, verifyOtp } = require('./otpMock');
const { submitBirthRegistration } = require('./birthRegistrationMock');
const { initiateCourierPayment } = require('./paymentsClient');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const store = createCaseStore();

app.post('/api/otp/request', (req, res) => {
  const { sludi } = req.body;
  if (!validateSludi(sludi)) {
    return res.status(400).json({ error: 'A SLUDI value is required' });
  }
  const result = requestOtp(sludi);
  res.json(result);
});

app.post('/api/otp/verify', (req, res) => {
  const { otp } = req.body;
  res.json({ valid: verifyOtp(otp) });
});

app.get('/api/cases', (req, res) => {
  res.json(store.listCases());
});

app.get('/api/cases/pending/:sludi', (req, res) => {
  res.json(store.listPendingCasesBySludi(req.params.sludi));
});

app.get('/api/nic/:nic', async (req, res) => {
  try {
    const result = await lookupNic(req.params.nic);
    if (!result.found) {
      return res.status(404).json({ found: false });
    }
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post('/api/pre-register', async (req, res) => {
  const { sludi, motherNic, fatherNic } = req.body;
  if (!validateSludi(sludi)) {
    return res.status(400).json({ error: 'A SLUDI value is required' });
  }
  let motherLookup;
  let fatherLookup;
  try {
    motherLookup = await lookupNic(motherNic);
    fatherLookup = fatherNic ? await lookupNic(fatherNic) : null;
  } catch (err) {
    return res.status(502).json({ error: `NIC lookup failed: ${err.message}` });
  }
  if (!motherLookup.found) {
    return res.status(400).json({ error: `Mother NIC ${motherNic} not found (try 736604450V, 845231907V, or 901245667V for the demo)` });
  }
  if (fatherNic && !fatherLookup.found) {
    return res.status(400).json({ error: `Father NIC ${fatherNic} not found (try 736604450V, 845231907V, or 901245667V for the demo)` });
  }
  const record = store.createCase({ sludi, mother: motherLookup.data, father: fatherLookup?.data || null });
  res.json(record);
});

app.get('/api/case/:reference', (req, res) => {
  const record = store.getCase(req.params.reference);
  if (!record) {
    return res.status(404).json({ error: 'Case not found' });
  }
  res.json(record);
});

app.post('/api/case/:reference/hospital-details', (req, res) => {
  try {
    const record = store.updateHospitalDetails(req.params.reference, req.body);
    res.json(record);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/case/:reference/finalize', async (req, res) => {
  const { reference } = req.params;
  const { childName, courierRequested } = req.body;
  let record;
  try {
    record = store.finalizeCase(reference, { childName, courierRequested });
  } catch (err) {
    return res.status(404).json({ error: err.message });
  }

  let payment = null;
  if (courierRequested) {
    payment = await initiateCourierPayment({
      reference,
      firstName: childName?.first,
      lastName: childName?.surname
    });
  }

  const registration = submitBirthRegistration({
    facilityDetails: record.hospitalDetails,
    motherDetails: record.mother,
    fatherDetails: record.father,
    children: [{ ...record.childName, ...record.hospitalDetails }]
  });

  const registered = store.markRegistered(reference, registration);
  res.json({ ...registered, payment });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Birth Registration Platform (Hospital Desk + API) listening on http://localhost:${PORT}`);
});
