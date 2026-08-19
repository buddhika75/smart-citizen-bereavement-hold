const FIXED_OTP = '123456';

function requestOtp(sludi) {
  if (typeof sludi !== 'string' || sludi.trim().length === 0) {
    return { sent: false };
  }
  return { sent: true, otp: FIXED_OTP };
}

function verifyOtp(otp) {
  return otp === FIXED_OTP;
}

module.exports = { requestOtp, verifyOtp };
