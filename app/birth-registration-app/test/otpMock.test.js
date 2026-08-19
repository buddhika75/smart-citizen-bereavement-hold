const test = require('node:test');
const assert = require('node:assert/strict');
const { requestOtp, verifyOtp } = require('../otpMock');

test('requestOtp returns the fixed demo OTP for a valid SLUDI', () => {
  const result = requestOtp('SLU100200300');
  assert.equal(result.sent, true);
  assert.equal(result.otp, '123456');
});

test('requestOtp rejects an empty SLUDI', () => {
  const result = requestOtp('');
  assert.equal(result.sent, false);
});

test('verifyOtp accepts the correct fixed OTP', () => {
  assert.equal(verifyOtp('123456'), true);
});

test('verifyOtp rejects an incorrect OTP', () => {
  assert.equal(verifyOtp('000000'), false);
});
