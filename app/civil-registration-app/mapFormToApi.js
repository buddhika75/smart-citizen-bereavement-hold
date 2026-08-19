const REQUIRED_FIELDS = ['dateOfDeath', 'deathNature', 'placeOfDeath', 'district', 'division', 'reportedBy'];

// Converts the Civil Registration officer's form (which also captures NIC,
// address, and date of birth for local record-keeping) into the payload
// shape the real Death Registration Services API accepts. NIC, address, and
// date of birth are intentionally dropped — the government schema has no
// such fields.
function toRegisterDeathPayload(form) {
  const deceasedName = form.fullName || form.deceasedName;
  if (!deceasedName) {
    throw new Error('deceasedName (fullName) is required');
  }
  for (const field of REQUIRED_FIELDS) {
    if (!form[field]) {
      throw new Error(`${field} is required`);
    }
  }

  return {
    sludi: form.sludi || null,
    personType: form.personType || 'Adult',
    deceasedName,
    dateOfDeath: form.dateOfDeath,
    timeOfDeath: form.timeOfDeath || null,
    placeOfDeath: form.placeOfDeath,
    district: form.district,
    division: form.division,
    deathNature: form.deathNature,
    motherSludi: form.motherSludi || null,
    fatherSludi: form.fatherSludi || null,
    guardianSludi: form.guardianSludi || null,
    reportedBy: form.reportedBy
  };
}

module.exports = { toRegisterDeathPayload };
