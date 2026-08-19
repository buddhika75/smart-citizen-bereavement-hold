const test = require('node:test');
const assert = require('node:assert/strict');
const { lookupNic } = require('../nicLookup');

test('lookupNic finds a seeded mother record', () => {
  const result = lookupNic('736604450V');
  assert.equal(result.found, true);
  assert.equal(result.data.fullNameEnglish, 'KAMANI SILVA');
});

test('lookupNic finds a seeded father record', () => {
  const result = lookupNic('882345671V');
  assert.equal(result.found, true);
  assert.equal(result.data.fullNameEnglish, 'NIMAL PERERA');
});

test('lookupNic returns not found for an unseeded NIC', () => {
  const result = lookupNic('000000000V');
  assert.equal(result.found, false);
});

test('lookupNic response shape matches the real API field names', () => {
  const result = lookupNic('736604450V');
  assert.ok('idCardNumber' in result.data);
  assert.ok('dateOfBirth' in result.data);
  assert.ok('addressLine1English' in result.data);
});
