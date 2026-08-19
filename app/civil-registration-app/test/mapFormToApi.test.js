const test = require('node:test');
const assert = require('node:assert/strict');
const { toRegisterDeathPayload } = require('../mapFormToApi');

const baseForm = {
  fullName: 'John Silva',
  nic: '199012345678',
  address: '12 Lake Road, Colombo',
  dateOfBirth: '1990-05-12',
  sludi: 'SLU123456',
  personType: 'Adult',
  dateOfDeath: '2026-08-10',
  timeOfDeath: '14:30',
  placeOfDeath: 'National Hospital Colombo',
  district: 'Colombo',
  division: 'Colombo',
  deathNature: 'Natural',
  reportedBy: 'MO123'
};

test('toRegisterDeathPayload only includes fields the real Death Registration Services schema accepts', () => {
  const payload = toRegisterDeathPayload(baseForm);
  const allowedKeys = [
    'sludi', 'personType', 'deceasedName', 'dateOfDeath', 'timeOfDeath',
    'placeOfDeath', 'district', 'division', 'deathNature',
    'motherSludi', 'fatherSludi', 'guardianSludi', 'reportedBy'
  ];
  for (const key of Object.keys(payload)) {
    assert.ok(allowedKeys.includes(key), `unexpected key sent to government API: ${key}`);
  }
  // NIC, address, and date of birth must never be transmitted — the real API has no such fields.
  assert.equal(payload.nic, undefined);
  assert.equal(payload.address, undefined);
  assert.equal(payload.dateOfBirth, undefined);
});

test('toRegisterDeathPayload maps fullName to deceasedName', () => {
  const payload = toRegisterDeathPayload(baseForm);
  assert.equal(payload.deceasedName, 'John Silva');
});

test('toRegisterDeathPayload defaults optional SLUDI relations to null when absent', () => {
  const payload = toRegisterDeathPayload(baseForm);
  assert.equal(payload.motherSludi, null);
  assert.equal(payload.fatherSludi, null);
  assert.equal(payload.guardianSludi, null);
});

test('toRegisterDeathPayload passes through motherSludi for a newborn record', () => {
  const payload = toRegisterDeathPayload({
    ...baseForm,
    personType: 'Newborn',
    sludi: '',
    motherSludi: 'SLU889900'
  });
  assert.equal(payload.sludi, null);
  assert.equal(payload.motherSludi, 'SLU889900');
});

test('toRegisterDeathPayload throws if a required field is missing', () => {
  const { deceasedName, ...incomplete } = baseForm;
  assert.throws(() => toRegisterDeathPayload({ ...incomplete, fullName: '' }), /deceasedName|fullName/i);
});
