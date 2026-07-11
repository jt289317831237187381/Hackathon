const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DevOtpService,
  LoginAttemptLimiter,
  OtpError,
  createToken,
  hashPassword,
  verifyPassword,
  verifyToken,
} = require('../auth');

test('local OTP has cooldown, attempt tracking and one-time verification', () => {
  let now = 1_700_000_000_000;
  let id = 0;
  const service = new DevOtpService({
    enabled: true,
    now: () => now,
    createId: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
  });

  const challenge = service.request('+61412345678');
  assert.equal(challenge.phone, '+61412345678');

  assert.throws(
    () => service.request('+61412345678'),
    (error) =>
      error instanceof OtpError &&
      error.code === 'otp_cooldown' &&
      error.details.retryAfterSeconds === 30
  );
  assert.throws(
    () => service.verify(challenge.challengeId, '000000'),
    (error) =>
      error instanceof OtpError &&
      error.code === 'otp_code_invalid' &&
      error.details.attemptsRemaining === 4
  );
  assert.deepEqual(service.verify(challenge.challengeId, '123456'), {
    phone: '+61412345678',
  });
  assert.throws(
    () => service.verify(challenge.challengeId, '123456'),
    (error) => error instanceof OtpError && error.code === 'otp_challenge_expired'
  );

  now += 30_000;
  assert.doesNotThrow(() => service.request('+61412345678'));
});

test('local OTP fails closed when disabled', () => {
  const service = new DevOtpService({ enabled: false });
  assert.throws(
    () => service.request('+61412345678'),
    (error) =>
      error instanceof OtpError && error.code === 'otp_provider_not_configured'
  );
});

test('OTP challenges are scoped to their authentication flow', () => {
  const service = new DevOtpService({ enabled: true });
  const challenge = service.request('+61412345670', 'registration');

  assert.throws(
    () => service.verify(challenge.challengeId, '123456', 'legacy-auth'),
    (error) =>
      error instanceof OtpError && error.code === 'otp_challenge_wrong_flow'
  );
  assert.deepEqual(
    service.verify(challenge.challengeId, '123456', 'registration'),
    { phone: '+61412345670' }
  );
});

test('passwords use salted scrypt records and verify safely', async () => {
  const first = await hashPassword('correct horse battery staple');
  const second = await hashPassword('correct horse battery staple');

  assert.match(first, /^scrypt\$16384\$8\$1\$/);
  assert.notEqual(first, second);
  assert.equal(
    await verifyPassword('correct horse battery staple', first),
    true
  );
  assert.equal(await verifyPassword('wrong password', first), false);
  assert.equal(await verifyPassword('wrong password', '$2b$old-bcrypt-record'), false);
});

test('login attempt limiting expires and can be cleared', () => {
  let now = 1_700_000_000_000;
  const limiter = new LoginAttemptLimiter({
    maxAttempts: 2,
    windowMs: 60_000,
    now: () => now,
  });

  limiter.recordFailure('member');
  limiter.recordFailure('member');
  assert.throws(
    () => limiter.assertAllowed('member'),
    (error) => error.code === 'login_rate_limited' && error.status === 429
  );
  limiter.clear('member');
  assert.doesNotThrow(() => limiter.assertAllowed('member'));

  limiter.recordFailure('member');
  limiter.recordFailure('member');
  now += 60_000;
  assert.doesNotThrow(() => limiter.assertAllowed('member'));
});

test('tokens round-trip and malformed tokens never reach timingSafeEqual unsafely', (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const token = createToken({ userId: 42, phoneVerified: true }, 60);
  const payload = verifyToken(token);
  assert.equal(payload.userId, 42);
  assert.equal(payload.sub, '42');
  assert.equal(payload.phoneVerified, true);
  assert.equal(verifyToken('a.e30.x'), null);
  assert.equal(verifyToken('not-a-token'), null);
});
