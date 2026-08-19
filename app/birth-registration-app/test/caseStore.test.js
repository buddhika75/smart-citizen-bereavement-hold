const test = require('node:test');
const assert = require('node:assert/strict');
const { createCaseStore } = require('../caseStore');

test('createCase generates a 6-digit reference and Pre-Registered status', () => {
  const store = createCaseStore();
  const result = store.createCase({
    sludi: 'SLU100200300',
    mother: { fullName: 'Kamani Silva' },
    father: { fullName: 'Nimal Perera' }
  });
  assert.match(result.reference, /^\d{6}$/);
  assert.equal(result.status, 'PRE_REGISTERED');
});

test('getCase returns the case by reference', () => {
  const store = createCaseStore();
  const created = store.createCase({ sludi: 'SLU1', mother: { fullName: 'A' } });
  const found = store.getCase(created.reference);
  assert.equal(found.sludi, 'SLU1');
});

test('getCase returns undefined for unknown reference', () => {
  const store = createCaseStore();
  assert.equal(store.getCase('999999'), undefined);
});

test('updateHospitalDetails attaches clinical data and advances status', () => {
  const store = createCaseStore();
  const created = store.createCase({ sludi: 'SLU1', mother: { fullName: 'A' } });
  const updated = store.updateHospitalDetails(created.reference, {
    birthWeightKg: 3.2,
    gender: 'Female',
    birthDate: '2026-08-01',
    hospitalId: 'CWH',
    hospitalName: 'Castle Street Hospital for Women',
    wardNumber: 'W-05',
    physicianName: 'Dr. Fernando'
  });
  assert.equal(updated.status, 'HOSPITAL_CONFIRMED');
  assert.equal(updated.hospitalDetails.hospitalName, 'Castle Street Hospital for Women');
});

test('updateHospitalDetails throws for unknown reference', () => {
  const store = createCaseStore();
  assert.throws(() => store.updateHospitalDetails('999999', {}), /not found/);
});

test('finalizeCase attaches child name and courier flag, advances status', () => {
  const store = createCaseStore();
  const created = store.createCase({ sludi: 'SLU1', mother: { fullName: 'A' } });
  store.updateHospitalDetails(created.reference, { hospitalName: 'CWH' });
  const finalized = store.finalizeCase(created.reference, {
    childName: { first: 'Ama', middle: '', surname: 'Perera' },
    courierRequested: true
  });
  assert.equal(finalized.status, 'FINALIZED');
  assert.equal(finalized.childName.first, 'Ama');
  assert.equal(finalized.courierRequested, true);
});

test('listCases returns all created cases', () => {
  const store = createCaseStore();
  store.createCase({ sludi: 'SLU1', mother: { fullName: 'A' } });
  store.createCase({ sludi: 'SLU2', mother: { fullName: 'B' } });
  assert.equal(store.listCases().length, 2);
});

test('listPendingCasesBySludi returns only that SLUDI\'s non-registered cases', () => {
  const store = createCaseStore();
  const mine1 = store.createCase({ sludi: 'SLU1', mother: { fullName: 'A' } });
  store.createCase({ sludi: 'SLU2', mother: { fullName: 'B' } });
  const mineRegistered = store.createCase({ sludi: 'SLU1', mother: { fullName: 'C' } });
  store.markRegistered(mineRegistered.reference, { notificationId: 'BN-1', rgdRegistrationNumber: 'RGD-1' });

  const pending = store.listPendingCasesBySludi('SLU1');
  assert.equal(pending.length, 1);
  assert.equal(pending[0].reference, mine1.reference);
});

test('markRegistered stores registration result and advances status', () => {
  const store = createCaseStore();
  const created = store.createCase({ sludi: 'SLU1', mother: { fullName: 'A' } });
  const registered = store.markRegistered(created.reference, {
    notificationId: 'BN-2026-1',
    rgdRegistrationNumber: 'RGD-B-2026-1'
  });
  assert.equal(registered.status, 'REGISTERED');
  assert.equal(registered.registration.rgdRegistrationNumber, 'RGD-B-2026-1');
});
