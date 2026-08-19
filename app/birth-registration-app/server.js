require('dotenv').config();
const express = require('express');
const path = require('path');

const { createCaseStore } = require('./caseStore');
const { lookupNic } = require('./nicLookup');
const { validateSludi } = require('./sludiMock');
const { submitBirthRegistration } = require('./birthRegistrationMock');
const { initiateCourierPayment } = require('./paymentsClient');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const store = createCaseStore();

app.get('/api/cases', (req, res) => {
  res.json(store.listCases());
});

app.get('/api/nic/:nic', (req, res) => {
  const result = lookupNic(req.params.nic);
  if (!result.found) {
    return res.status(404).json({ found: false });
  }
  res.json(result);
});

app.post('/api/pre-register', (req, res) => {
  const { sludi, motherNic, fatherNic } = req.body;
  if (!validateSludi(sludi)) {
    return res.status(400).json({ error: 'A SLUDI value is required' });
  }
  const motherLookup = lookupNic(motherNic);
  if (!motherLookup.found) {
    return res.status(400).json({ error: `Mother NIC ${motherNic} not found (try 736604450V for the demo)` });
  }
  let father = null;
  if (fatherNic) {
    const fatherLookup = lookupNic(fatherNic);
    if (!fatherLookup.found) {
      return res.status(400).json({ error: `Father NIC ${fatherNic} not found (try 882345671V for the demo)` });
    }
    father = fatherLookup.data;
  }
  const record = store.createCase({ sludi, mother: motherLookup.data, father });
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
  console.log(`Birth Registration Platform listening on http://localhost:${PORT}`);
});
