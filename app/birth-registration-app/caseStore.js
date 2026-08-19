function generateReference(existingRefs) {
  let ref;
  do {
    ref = String(Math.floor(100000 + Math.random() * 900000));
  } while (existingRefs.has(ref));
  return ref;
}

function createCaseStore() {
  const cases = new Map();

  function createCase({ sludi, mother, father }) {
    const reference = generateReference(new Set(cases.keys()));
    const record = {
      reference,
      sludi,
      mother,
      father: father || null,
      status: 'PRE_REGISTERED',
      hospitalDetails: null,
      childName: null,
      courierRequested: false,
      registration: null,
      createdAt: new Date().toISOString()
    };
    cases.set(reference, record);
    return record;
  }

  function getCase(reference) {
    return cases.get(reference);
  }

  function updateHospitalDetails(reference, details) {
    const record = cases.get(reference);
    if (!record) {
      throw new Error(`Case ${reference} not found`);
    }
    record.hospitalDetails = { ...details };
    record.status = 'HOSPITAL_CONFIRMED';
    return record;
  }

  function finalizeCase(reference, { childName, courierRequested }) {
    const record = cases.get(reference);
    if (!record) {
      throw new Error(`Case ${reference} not found`);
    }
    record.childName = childName;
    record.courierRequested = !!courierRequested;
    record.status = 'FINALIZED';
    return record;
  }

  function markRegistered(reference, registrationResult) {
    const record = cases.get(reference);
    if (!record) {
      throw new Error(`Case ${reference} not found`);
    }
    record.registration = registrationResult;
    record.status = 'REGISTERED';
    return record;
  }

  function listCases() {
    return Array.from(cases.values());
  }

  function listPendingCasesBySludi(sludi) {
    return Array.from(cases.values()).filter(c => c.sludi === sludi && c.status !== 'REGISTERED');
  }

  return { createCase, getCase, updateHospitalDetails, finalizeCase, markRegistered, listCases, listPendingCasesBySludi };
}

module.exports = { createCaseStore };
