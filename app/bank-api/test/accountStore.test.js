const test = require('node:test');
const assert = require('node:assert/strict');
const { createAccountStore } = require('../accountStore');

const seed = () => [
  { accountId: 'ACC-00123', sludi: 'SLU123456789', name: 'John Silva', balance: 154320.5, status: 'ACTIVE' },
  { accountId: 'ACC-00124', sludi: 'SLU223456789', name: 'Kamala Perera', balance: 8250, status: 'ACTIVE' },
  { accountId: 'ACC-00125', sludi: 'SLU323456789', name: 'Ruwan Fernando', balance: 500, status: 'ACTIVE' }
];

test('listAccounts returns all seeded accounts untouched', () => {
  const store = createAccountStore(seed());
  const accounts = store.listAccounts();
  assert.equal(accounts.length, 3);
  assert.equal(accounts[0].status, 'ACTIVE');
});

test('notify with a matching SLUDI places that account ON_HOLD and returns matched:true', () => {
  const store = createAccountStore(seed());
  const result = store.notify({ sludi: 'SLU123456789', dateOfDeath: '2026-08-10', sourceNotificationId: 'DN-2026-000001' });

  assert.equal(result.matched, true);
  assert.equal(result.accountId, 'ACC-00123');
  assert.equal(result.status, 'ON_HOLD');

  const [account] = store.listAccounts().filter(a => a.accountId === 'ACC-00123');
  assert.equal(account.status, 'ON_HOLD');
  assert.equal(account.heldReason, 'Confirmed death notification received');
  assert.equal(account.sourceNotificationId, 'DN-2026-000001');
  assert.ok(account.heldAt, 'heldAt should be set');
});

test('notify with a non-matching SLUDI leaves all accounts untouched and returns matched:false', () => {
  const store = createAccountStore(seed());
  const result = store.notify({ sludi: 'SLU-NOT-A-CUSTOMER', dateOfDeath: '2026-08-10', sourceNotificationId: 'DN-2026-000002' });

  assert.equal(result.matched, false);
  assert.equal(result.accountId, undefined);

  const accounts = store.listAccounts();
  assert.ok(accounts.every(a => a.status === 'ACTIVE'));
});

test('notify is idempotent — re-notifying an already-held account stays ON_HOLD and still reports matched:true', () => {
  const store = createAccountStore(seed());
  store.notify({ sludi: 'SLU123456789', dateOfDeath: '2026-08-10', sourceNotificationId: 'DN-2026-000001' });
  const second = store.notify({ sludi: 'SLU123456789', dateOfDeath: '2026-08-10', sourceNotificationId: 'DN-2026-000001' });

  assert.equal(second.matched, true);
  assert.equal(second.status, 'ON_HOLD');
  const accounts = store.listAccounts().filter(a => a.status === 'ON_HOLD');
  assert.equal(accounts.length, 1);
});

test('notify without a sludi throws a validation error', () => {
  const store = createAccountStore(seed());
  assert.throws(() => store.notify({ dateOfDeath: '2026-08-10' }), /sludi is required/i);
});
