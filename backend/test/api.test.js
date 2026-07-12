const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PassThrough, Readable } = require('node:stream');
const { app } = require('../server');
const {
  loginAttemptLimiter,
  otpService,
  pendingRegistrationService,
} = require('../auth');

function request({ method = 'GET', url, body, headers = {} }) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? '' : JSON.stringify(body);
    let bodySent = false;
    const req = new Readable({
      read() {
        if (bodySent) return;
        bodySent = true;
        if (payload) this.push(payload);
        this.push(null);
      },
    });
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.headers = Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
    );
    if (payload) {
      req.headers['content-type'] ||= 'application/json';
      req.headers['content-length'] = String(Buffer.byteLength(payload));
    }
    req.socket = new PassThrough();
    req.connection = req.socket;

    const responseHeaders = {};
    const chunks = [];
    const res = {
      statusCode: 200,
      headersSent: false,
      setHeader(name, value) {
        responseHeaders[name.toLowerCase()] = value;
      },
      getHeader(name) {
        return responseHeaders[name.toLowerCase()];
      },
      getHeaders() {
        return { ...responseHeaders };
      },
      hasHeader(name) {
        return Object.hasOwn(responseHeaders, name.toLowerCase());
      },
      removeHeader(name) {
        delete responseHeaders[name.toLowerCase()];
      },
      writeHead(statusCode) {
        this.statusCode = statusCode;
        this.headersSent = true;
        return this;
      },
      write(chunk) {
        if (chunk) chunks.push(Buffer.from(chunk));
        return true;
      },
      end(chunk) {
        if (chunk) chunks.push(Buffer.from(chunk));
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        if (text) {
          try {
            json = JSON.parse(text);
          } catch (error) {
            reject(error);
            return;
          }
        }
        resolve({ status: this.statusCode, headers: responseHeaders, text, json });
      },
      on() {
        return this;
      },
      once() {
        return this;
      },
      emit() {
        return true;
      },
    };

    try {
      app(req, res);
    } catch (error) {
      reject(error);
    }
  });
}

test('public catalog exposes real official products and labelled synthetic reviews', async () => {
  const health = await request({ url: '/api/health' });
  assert.equal(health.status, 200);
  assert.equal(health.json.productionReady, false);

  const catalog = await request({
    url: '/api/catalog?category=kitchen&limit=2&sort=longest-lifespan',
  });
  assert.equal(catalog.status, 200);
  assert.equal(catalog.json.meta.isDemoData, true);
  assert.equal(catalog.json.meta.productDataIsReal, true);
  assert.equal(
    catalog.json.meta.productProvenance,
    'official_manufacturer_website'
  );
  assert.equal(
    catalog.json.meta.syntheticReviewsExcludedFromCommunityMetrics,
    true
  );
  assert.equal(catalog.json.products.length, 2);
  assert.ok(
    catalog.json.products.every(
      (product) =>
        product.isRealProduct === true &&
        product.isDemoData === false &&
        product.communityRating === null &&
        product.reviewCount === 0
    )
  );

  const missingQuery = await request({ url: '/api/search' });
  assert.equal(missingQuery.status, 400);
  assert.equal(missingQuery.json.error.details.field, 'q');

  const search = await request({ url: '/api/search?q=breville' });
  assert.equal(search.status, 200);
  assert.deepEqual(
    search.json.products.map((product) => product.id),
    ['breville-bes875']
  );

  const detail = await request({ url: '/api/products/breville-bes875' });
  assert.equal(detail.status, 200);
  assert.equal(detail.json.meta.isDemoData, true);
  assert.equal(detail.json.product.isRealProduct, true);
  assert.equal(detail.json.product.isDemoData, false);
  assert.equal(detail.json.product.communityRating, null);
  assert.equal(detail.json.product.reviewCount, 0);
  assert.equal(detail.json.reviews.length, 8);
  assert.ok(
    detail.json.reviews.every(
      (review) =>
        review.isDemoData === true &&
        review.isSynthetic === true &&
        review.provenance === 'synthetic_demo' &&
        /synthetic/i.test(review.title) &&
        /synthetic/i.test(review.reviewText)
    )
  );
  assert.equal('redditRating' in detail.json, false);
});

test('registration fails closed when the SMS-backed OTP service is unavailable', async (t) => {
  const previousEnabled = otpService.enabled;
  otpService.enabled = false;
  t.after(() => {
    otpService.enabled = previousEnabled;
    otpService.reset();
  });

  const response = await request({
    method: 'POST',
    url: '/api/auth/register/start',
    body: {
      email: 'member@example.com',
      username: 'careful_buyer',
      password: 'correct horse battery staple',
      phone: '+61400000080',
    },
  });
  assert.equal(response.status, 503);
  assert.equal(response.json.error.code, 'otp_provider_not_configured');
});

test('development OTP creates a scoped ownership session and score', async (t) => {
  const previousDataFile = process.env.DATA_FILE;
  const previousSecret = process.env.JWT_SECRET;
  const dataFile = path.join(
    os.tmpdir(),
    `worthit-api-test-${process.pid}-${Date.now()}.json`
  );
  process.env.DATA_FILE = dataFile;
  process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters';
  otpService.reset();

  t.after(() => {
    otpService.reset();
    if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);
    if (previousDataFile === undefined) delete process.env.DATA_FILE;
    else process.env.DATA_FILE = previousDataFile;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const requested = await request({
    method: 'POST',
    url: '/api/auth/otp/request',
    body: { phone: '+61400000091' },
  });
  assert.equal(requested.status, 202);
  assert.equal(requested.json.developmentCode, '123456');
  assert.equal('phone' in requested.json, false);

  const verified = await request({
    method: 'POST',
    url: '/api/auth/otp/verify',
    body: {
      challengeId: requested.json.challengeId,
      code: '123456',
    },
  });
  assert.equal(verified.status, 200);
  assert.equal(verified.json.user.phoneVerified, true);
  assert.equal('phone' in verified.json.user, false);
  const authorization = `Bearer ${verified.json.token}`;

  const created = await request({
    method: 'POST',
    url: '/api/ownership',
    headers: { authorization },
    body: {
      productId: 'breville-bes875',
      purchaseDate: '2025-01-01',
      expectedLifespanMonths: 96,
      condition: 'Good',
      status: 'Active',
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.json.item.productId, 'breville-bes875');
  assert.equal(created.json.item.expectedLifespanMonths, 96);
  assert.equal(created.json.item.lifespan.expectedLifespanMonths, 96);

  const ownership = await request({
    url: '/api/ownership',
    headers: { authorization },
  });
  assert.equal(ownership.status, 200);
  assert.equal(ownership.json.total, 1);

  const score = await request({
    url: '/api/products/breville-bes875/purchase-score',
    headers: { authorization },
  });
  assert.equal(score.status, 200);
  assert.equal(score.json.meta.scoreUsesPrivateLocalOwnershipData, true);
  assert.equal(typeof score.json.purchaseScore.score, 'number');
  assert.match(score.json.purchaseScore.disclaimer, /not financial advice/i);

  const otherTokenRequest = await request({
    method: 'POST',
    url: '/api/auth/otp/request',
    body: { phone: '+61400000092' },
  });
  const otherVerified = await request({
    method: 'POST',
    url: '/api/auth/otp/verify',
    body: {
      challengeId: otherTokenRequest.json.challengeId,
      code: '123456',
    },
  });
  const otherOwnership = await request({
    url: '/api/ownership',
    headers: { authorization: `Bearer ${otherVerified.json.token}` },
  });
  assert.equal(otherOwnership.status, 200);
  assert.equal(otherOwnership.json.total, 0);
});

test('credential signup verifies the phone before account creation and supports username or email login', async (t) => {
  const previousDataFile = process.env.DATA_FILE;
  const previousSecret = process.env.JWT_SECRET;
  const dataFile = path.join(
    os.tmpdir(),
    `worthit-credential-test-${process.pid}-${Date.now()}.json`
  );
  process.env.DATA_FILE = dataFile;
  process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters';
  otpService.reset();
  pendingRegistrationService.reset();
  loginAttemptLimiter.reset();

  t.after(() => {
    otpService.reset();
    pendingRegistrationService.reset();
    loginAttemptLimiter.reset();
    if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);
    if (previousDataFile === undefined) delete process.env.DATA_FILE;
    else process.env.DATA_FILE = previousDataFile;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const started = await request({
    method: 'POST',
    url: '/api/auth/register/start',
    body: {
      email: 'Member@Example.COM',
      username: 'Careful_Buyer',
      password: 'correct horse battery staple',
      phone: '+61400000081',
    },
  });
  assert.equal(started.status, 202);
  assert.equal(started.json.developmentCode, '123456');
  assert.equal(JSON.stringify(started.json).includes('+61400000081'), false);
  assert.equal(fs.existsSync(dataFile), false);

  const wrongFlow = await request({
    method: 'POST',
    url: '/api/auth/otp/verify',
    body: { challengeId: started.json.challengeId, code: '123456' },
  });
  assert.equal(wrongFlow.status, 400);
  assert.equal(wrongFlow.json.error.code, 'otp_challenge_wrong_flow');

  const wrongCode = await request({
    method: 'POST',
    url: '/api/auth/register/verify',
    body: { challengeId: started.json.challengeId, code: '000000' },
  });
  assert.equal(wrongCode.status, 401);

  const verified = await request({
    method: 'POST',
    url: '/api/auth/register/verify',
    body: { challengeId: started.json.challengeId, code: '123456' },
  });
  assert.equal(verified.status, 201);
  assert.equal(verified.json.user.email, 'member@example.com');
  assert.equal(verified.json.user.username, 'careful_buyer');
  assert.equal(verified.json.user.phoneVerified, true);
  assert.equal('phone' in verified.json.user, false);
  assert.equal(JSON.stringify(verified.json).includes('+61400000081'), false);

  const database = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.equal(database.users.length, 1);
  assert.match(database.users[0].passwordHash, /^scrypt\$/);
  assert.notEqual(
    database.users[0].passwordHash,
    'correct horse battery staple'
  );

  const usernameLogin = await request({
    method: 'POST',
    url: '/api/auth/login',
    body: {
      identifier: 'CAREFUL_BUYER',
      password: 'correct horse battery staple',
    },
  });
  assert.equal(usernameLogin.status, 200);
  assert.equal('phone' in usernameLogin.json.user, false);

  const emailLogin = await request({
    method: 'POST',
    url: '/api/login',
    body: {
      identifier: 'MEMBER@EXAMPLE.COM',
      password: 'correct horse battery staple',
    },
  });
  assert.equal(emailLogin.status, 200);

  const session = await request({
    url: '/api/auth/session',
    headers: { authorization: `Bearer ${emailLogin.json.token}` },
  });
  assert.equal(session.status, 200);
  assert.equal(session.json.authMode, 'local-development-password');

  const duplicate = await request({
    method: 'POST',
    url: '/api/auth/register/start',
    body: {
      email: 'member@example.com',
      username: 'someone_else',
      password: 'another safe password',
      phone: '+61400000082',
    },
  });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.json.error.details.field, 'email');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const rejected = await request({
      method: 'POST',
      url: '/api/auth/login',
      body: { identifier: 'careful_buyer', password: 'incorrect password' },
    });
    assert.equal(rejected.status, 401);
  }
  const limited = await request({
    method: 'POST',
    url: '/api/auth/login',
    body: { identifier: 'careful_buyer', password: 'incorrect password' },
  });
  assert.equal(limited.status, 429);
  assert.equal(limited.json.error.code, 'login_rate_limited');
  assert.ok(Number(limited.headers['retry-after']) > 0);
});
