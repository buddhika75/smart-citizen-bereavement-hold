const SEEDED_RECORDS = {
  '736604450V': {
    idCardNumber: '736604450V',
    fullNameEnglish: 'KAMANI SILVA',
    dateOfBirth: '1990-01-23',
    gender: 'Female',
    addressLine1English: 'PALAHITHTHAGODA,',
    addressLine2English: 'BORALANDA.'
  },
  '882345671V': {
    idCardNumber: '882345671V',
    fullNameEnglish: 'NIMAL PERERA',
    dateOfBirth: '1988-06-12',
    gender: 'Male',
    addressLine1English: 'NO 12, TEMPLE ROAD,',
    addressLine2English: 'COLOMBO 06.'
  }
};

function lookupNic(nic) {
  const record = SEEDED_RECORDS[nic];
  if (!record) {
    return { found: false };
  }
  return { found: true, data: { ...record } };
}

module.exports = { lookupNic };
