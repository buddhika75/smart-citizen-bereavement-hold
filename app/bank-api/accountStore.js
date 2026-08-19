function createAccountStore(initialAccounts) {
  const accounts = initialAccounts.map(a => ({ ...a }));

  function listAccounts() {
    return accounts.map(a => ({ ...a }));
  }

  function notify({ sludi, dateOfDeath, sourceNotificationId }) {
    if (!sludi) {
      throw new Error('sludi is required');
    }

    const account = accounts.find(a => a.sludi === sludi);
    if (!account) {
      return { matched: false };
    }

    account.status = 'ON_HOLD';
    account.heldReason = 'Confirmed death notification received';
    account.heldAt = new Date().toISOString();
    account.dateOfDeath = dateOfDeath || account.dateOfDeath || null;
    account.sourceNotificationId = sourceNotificationId || account.sourceNotificationId || null;

    return { matched: true, accountId: account.accountId, status: account.status };
  }

  return { listAccounts, notify };
}

module.exports = { createAccountStore };
