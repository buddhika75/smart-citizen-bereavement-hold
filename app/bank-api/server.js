const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { createAccountStore } = require('./accountStore');
const customers = require('./customers.json');

const PORT = process.env.PORT || 4000;

const app = express();
const store = createAccountStore(customers);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/accounts', (req, res) => {
  res.json(store.listAccounts());
});

app.post('/notify', (req, res) => {
  const { sludi, dateOfDeath, sourceNotificationId } = req.body || {};
  try {
    const result = store.notify({ sludi, dateOfDeath, sourceNotificationId });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Smart Citizen Bank API listening on http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/`);
});
