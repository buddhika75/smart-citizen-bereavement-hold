require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5002;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

app.get('/api/config', (req, res) => {
  res.json({ backendUrl: BACKEND_URL });
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Birth Registration Platform (Parent app) listening on http://localhost:${PORT}`);
  console.log(`Calling backend API at ${BACKEND_URL}`);
});
