let counter = 77800;

function submitBirthRegistration({ facilityDetails, motherDetails, fatherDetails, children }) {
  counter += 1;
  const notificationId = `BN-2026-${counter}`;
  const rgdRegistrationNumber = `RGD-B-2026-${counter}`;
  return {
    notificationId,
    status: 'SUBMITTED_TO_RGD',
    message: 'Birth notification successfully submitted to Registrar General’s Department. (Simulated — Birth Registration API is conceptual in this sandbox.)',
    timestamp: new Date().toISOString(),
    rgdRegistrationNumber,
    dateOfRegistration: new Date().toISOString().slice(0, 10)
  };
}

module.exports = { submitBirthRegistration };
