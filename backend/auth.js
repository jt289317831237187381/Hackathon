const crypto = require('crypto');

const TOKEN_ISSUER = 'worthit-local-api';
const LOCAL_ONLY_TOKEN_SECRET =
  'worthit-local-development-secret-do-not-use-in-production';
const DEV_OTP_CODE = '123456';
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 32 * 1024 * 1024;

class AuthConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthConfigurationError';
    this.status = 503;
    this.code = 'auth_not_configured';
  }
}

class OtpError extends Error {
  constructor(message, { status = 400, code = 'otp_error', details = null } = {}) {
    super(message);
    this.name = 'OtpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

class CredentialError extends Error {
  constructor(
    message,
    { status = 401, code = 'invalid_credentials', details = null } = {}
  ) {
    super(message);
    this.name = 'CredentialError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function getTokenSecret() {
  const configuredSecret = process.env.JWT_SECRET;

  if (configuredSecret) {
    if (configuredSecret.length < 32) {
      throw new AuthConfigurationError(
        'JWT_SECRET must contain at least 32 characters.'
      );
    }
    return configuredSecret;
  }
  if (isProduction()) {
    throw new AuthConfigurationError(
      'JWT_SECRET is required before local token authentication can run in production.'
    );
  }
  return LOCAL_ONLY_TOKEN_SECRET;
}

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createToken(payload, expiresInSeconds = 604800) {
  if (!payload || payload.userId === undefined || payload.userId === null) {
    throw new TypeError('A userId is required to create a token.');
  }
  if (!Number.isInteger(expiresInSeconds) || expiresInSeconds <= 0) {
    throw new TypeError('Token lifetime must be a positive number of seconds.');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' });
  const body = encodeJson({
    ...payload,
    sub: String(payload.userId),
    iss: TOKEN_ISSUER,
    iat: now,
    exp: now + expiresInSeconds,
  });
  const signature = crypto
    .createHmac('sha256', getTokenSecret())
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (typeof token !== 'string' || token.length > 4096) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) return null;

  try {
    const [headerPart, bodyPart, signature] = parts;
    const expected = crypto
      .createHmac('sha256', getTokenSecret())
      .update(`${headerPart}.${bodyPart}`)
      .digest('base64url');
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(bodyPart, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);

    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
    if (payload.iss !== TOKEN_ISSUER) return null;
    if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)) return null;
    if (payload.exp <= now || payload.iat > now + 60) return null;
    if (payload.userId === undefined || payload.userId === null) return null;
    if (payload.sub !== String(payload.userId)) return null;
    return payload;
  } catch (error) {
    if (error instanceof AuthConfigurationError) throw error;
    return null;
  }
}

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+([^\s]+)$/i);
  return match ? match[1] : null;
}

function sendAuthError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function authenticate(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return sendAuthError(
      res,
      401,
      'authentication_required',
      'A bearer token is required.'
    );
  }

  try {
    const payload = verifyToken(token);
    if (!payload) {
      return sendAuthError(
        res,
        401,
        'invalid_token',
        'The bearer token is invalid or expired.'
      );
    }
    req.auth = payload;
    req.userId = payload.userId;
    return next();
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return sendAuthError(res, error.status, error.code, error.message);
    }
    return next(error);
  }
}

function optionalAuthenticate(req, res, next) {
  if (!req.headers.authorization) return next();
  return authenticate(req, res, next);
}

function runScrypt(password, salt, options = {}) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      {
        N: options.N ?? SCRYPT_COST,
        r: options.r ?? SCRYPT_BLOCK_SIZE,
        p: options.p ?? SCRYPT_PARALLELIZATION,
        maxmem: SCRYPT_MAX_MEMORY,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      }
    );
  });
}

function serializePasswordHash(salt, derivedKey) {
  return [
    'scrypt',
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

function parsePasswordHash(value) {
  if (typeof value !== 'string' || value.length > 512) return null;
  const [algorithm, cost, blockSize, parallelization, salt, derivedKey, extra] =
    value.split('$');
  if (
    extra !== undefined ||
    algorithm !== 'scrypt' ||
    Number(cost) !== SCRYPT_COST ||
    Number(blockSize) !== SCRYPT_BLOCK_SIZE ||
    Number(parallelization) !== SCRYPT_PARALLELIZATION ||
    !/^[A-Za-z0-9_-]+$/.test(salt || '') ||
    !/^[A-Za-z0-9_-]+$/.test(derivedKey || '')
  ) {
    return null;
  }

  const saltBuffer = Buffer.from(salt, 'base64url');
  const derivedKeyBuffer = Buffer.from(derivedKey, 'base64url');
  if (saltBuffer.length < 16 || derivedKeyBuffer.length !== SCRYPT_KEY_LENGTH) {
    return null;
  }
  return {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelization),
    salt: saltBuffer,
    derivedKey: derivedKeyBuffer,
  };
}

const DUMMY_PASSWORD_HASH = serializePasswordHash(
  Buffer.from('worthit-dummy-salt'),
  crypto.scryptSync(
    'not-a-real-worthit-password',
    Buffer.from('worthit-dummy-salt'),
    SCRYPT_KEY_LENGTH,
    {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCK_SIZE,
      p: SCRYPT_PARALLELIZATION,
      maxmem: SCRYPT_MAX_MEMORY,
    }
  )
);

async function hashPassword(password) {
  if (typeof password !== 'string') {
    throw new TypeError('A password string is required.');
  }
  const salt = crypto.randomBytes(16);
  const derivedKey = await runScrypt(password, salt);
  return serializePasswordHash(salt, derivedKey);
}

async function verifyPassword(password, passwordHash) {
  if (typeof password !== 'string') return false;
  const stored = parsePasswordHash(passwordHash);
  const parsed = stored || parsePasswordHash(DUMMY_PASSWORD_HASH);
  const candidate = await runScrypt(password, parsed.salt, parsed);
  return (
    stored !== null &&
    candidate.length === parsed.derivedKey.length &&
    crypto.timingSafeEqual(candidate, parsed.derivedKey)
  );
}

class LoginAttemptLimiter {
  constructor({ maxAttempts = 5, windowMs = 15 * 60 * 1000, now = () => Date.now() } = {}) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.now = now;
    this.failures = new Map();
  }

  getActiveRecord(key) {
    const record = this.failures.get(key);
    if (!record) return null;
    if (record.startedAt + this.windowMs <= this.now()) {
      this.failures.delete(key);
      return null;
    }
    return record;
  }

  assertAllowed(key) {
    const record = this.getActiveRecord(key);
    if (!record || record.count < this.maxAttempts) return;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((record.startedAt + this.windowMs - this.now()) / 1000)
    );
    throw new CredentialError('Too many unsuccessful sign-in attempts.', {
      status: 429,
      code: 'login_rate_limited',
      details: { retryAfterSeconds },
    });
  }

  recordFailure(key) {
    const existing = this.getActiveRecord(key);
    if (existing) existing.count += 1;
    else this.failures.set(key, { count: 1, startedAt: this.now() });
  }

  clear(key) {
    this.failures.delete(key);
  }

  reset() {
    this.failures.clear();
  }
}

class PendingRegistrationService {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
    this.pending = new Map();
  }

  pruneExpired() {
    const now = this.now();
    for (const [challengeId, registration] of this.pending) {
      if (registration.expiresAt <= now) this.pending.delete(challengeId);
    }
  }

  store(challenge, registration) {
    this.pruneExpired();
    for (const [challengeId, pending] of this.pending) {
      if (pending.phone === registration.phone) this.pending.delete(challengeId);
    }
    this.pending.set(challenge.challengeId, {
      ...registration,
      expiresAt: challenge.expiresAt,
    });
  }

  consume(challengeId, phone) {
    this.pruneExpired();
    const registration = this.pending.get(challengeId);
    this.pending.delete(challengeId);
    if (!registration || registration.phone !== phone) {
      throw new OtpError('The registration challenge is invalid or has expired.', {
        status: 410,
        code: 'registration_challenge_expired',
      });
    }
    return registration;
  }

  reset() {
    this.pending.clear();
  }
}

class DevOtpService {
  constructor({
    enabled = !isProduction(),
    code = DEV_OTP_CODE,
    ttlMs = 5 * 60 * 1000,
    cooldownMs = 30 * 1000,
    maxAttempts = 5,
    now = () => Date.now(),
    createId = () => crypto.randomUUID(),
  } = {}) {
    this.enabled = enabled;
    this.code = code;
    this.ttlMs = ttlMs;
    this.cooldownMs = cooldownMs;
    this.maxAttempts = maxAttempts;
    this.now = now;
    this.createId = createId;
    this.challenges = new Map();
    this.lastRequestByPhone = new Map();
  }

  assertEnabled() {
    if (!this.enabled) {
      throw new OtpError(
        'Local OTP is disabled in production. Configure Supabase Auth and an SMS provider before enabling phone authentication.',
        { status: 503, code: 'otp_provider_not_configured' }
      );
    }
  }

  pruneExpired() {
    const now = this.now();
    for (const [challengeId, challenge] of this.challenges) {
      if (challenge.expiresAt <= now) this.challenges.delete(challengeId);
    }
    for (const [phone, requestedAt] of this.lastRequestByPhone) {
      if (requestedAt + this.cooldownMs <= now) {
        this.lastRequestByPhone.delete(phone);
      }
    }
  }

  request(phone, purpose = 'legacy-auth') {
    this.assertEnabled();
    this.pruneExpired();
    const now = this.now();
    const previousRequest = this.lastRequestByPhone.get(phone);

    if (previousRequest !== undefined && previousRequest + this.cooldownMs > now) {
      const retryAfterSeconds = Math.ceil(
        (previousRequest + this.cooldownMs - now) / 1000
      );
      throw new OtpError('Please wait before requesting another code.', {
        status: 429,
        code: 'otp_cooldown',
        details: { retryAfterSeconds },
      });
    }

    for (const [challengeId, challenge] of this.challenges) {
      if (challenge.phone === phone && challenge.purpose === purpose) {
        this.challenges.delete(challengeId);
      }
    }

    const challengeId = this.createId();
    const challenge = {
      challengeId,
      phone,
      purpose,
      attempts: 0,
      createdAt: now,
      expiresAt: now + this.ttlMs,
    };
    this.challenges.set(challengeId, challenge);
    this.lastRequestByPhone.set(phone, now);
    return { ...challenge };
  }

  verify(challengeId, code, expectedPurpose = null) {
    this.assertEnabled();
    const challenge = this.challenges.get(challengeId);
    const now = this.now();

    if (!challenge) {
      throw new OtpError('The OTP challenge is invalid or has expired.', {
        status: 410,
        code: 'otp_challenge_expired',
      });
    }
    if (challenge.expiresAt <= now) {
      this.challenges.delete(challengeId);
      throw new OtpError('The OTP code has expired.', {
        status: 410,
        code: 'otp_code_expired',
      });
    }
    if (expectedPurpose && challenge.purpose !== expectedPurpose) {
      throw new OtpError('This OTP challenge belongs to a different flow.', {
        status: 400,
        code: 'otp_challenge_wrong_flow',
      });
    }

    if (code !== this.code) {
      challenge.attempts += 1;
      if (challenge.attempts >= this.maxAttempts) {
        this.challenges.delete(challengeId);
        throw new OtpError('Too many incorrect OTP attempts.', {
          status: 429,
          code: 'otp_attempts_exceeded',
        });
      }
      throw new OtpError('The OTP code is incorrect.', {
        status: 401,
        code: 'otp_code_invalid',
        details: { attemptsRemaining: this.maxAttempts - challenge.attempts },
      });
    }

    this.challenges.delete(challengeId);
    return { phone: challenge.phone };
  }

  reset() {
    this.challenges.clear();
    this.lastRequestByPhone.clear();
  }
}

const otpService = new DevOtpService();
const loginAttemptLimiter = new LoginAttemptLimiter();
const pendingRegistrationService = new PendingRegistrationService();

module.exports = {
  AuthConfigurationError,
  CredentialError,
  DEV_OTP_CODE,
  DevOtpService,
  LoginAttemptLimiter,
  OtpError,
  PendingRegistrationService,
  authenticate,
  createToken,
  hashPassword,
  loginAttemptLimiter,
  optionalAuthenticate,
  otpService,
  pendingRegistrationService,
  verifyPassword,
  verifyToken,
};
