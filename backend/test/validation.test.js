const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ValidationError,
  maskPhoneNumber,
  normalizePhoneNumber,
  parseCatalogQuery,
  validateLogin,
  validateOtpVerification,
  validateOwnershipCreate,
  validateOwnershipPatch,
  validateRegistrationStart,
} = require('../validation');

test('phone numbers normalize to strict E.164 and are masked', () => {
  const phone = normalizePhoneNumber('0061 (412) 345-678');
  assert.equal(phone, '+61412345678');
  assert.equal(maskPhoneNumber(phone).endsWith('5678'), true);
  assert.equal(maskPhoneNumber(phone).includes('4123'), false);
  assert.throws(
    () => normalizePhoneNumber('0412 345 678'),
    (error) => error instanceof ValidationError && error.field === 'phone'
  );
});

test('OTP verification rejects unknown fields and malformed challenges', () => {
  assert.throws(
    () =>
      validateOtpVerification({
        challengeId: '00000000-0000-4000-8000-000000000001',
        code: '123456',
        phone: '+61412345678',
      }),
    (error) => error instanceof ValidationError && error.field === 'phone'
  );
  assert.throws(
    () => validateOtpVerification({ challengeId: 'bad', code: '123456' }),
    (error) => error instanceof ValidationError && error.field === 'challengeId'
  );
});

test('credential registration and login inputs normalize and validate', () => {
  assert.deepEqual(
    validateRegistrationStart({
      email: ' Member@Example.COM ',
      username: ' Careful.Buyer ',
      password: 'eight-or-more',
      phone: '0061 412 345 678',
    }),
    {
      email: 'member@example.com',
      username: 'careful.buyer',
      password: 'eight-or-more',
      phone: '+61412345678',
    }
  );
  assert.deepEqual(
    validateLogin({ identifier: ' CAREFUL.BUYER ', password: 'eight-or-more' }),
    { identifier: 'careful.buyer', password: 'eight-or-more' }
  );
  assert.throws(
    () =>
      validateRegistrationStart({
        email: 'not-an-email',
        username: 'careful_buyer',
        password: 'eight-or-more',
        phone: '+61412345678',
      }),
    (error) => error instanceof ValidationError && error.field === 'email'
  );
  assert.throws(
    () =>
      validateRegistrationStart({
        email: 'member@example.com',
        username: 'no spaces allowed',
        password: 'short',
        phone: '+61412345678',
      }),
    (error) => error instanceof ValidationError && error.field === 'username'
  );
});

test('catalog query parsing validates bounds, duplicates and categories', () => {
  const parsed = parseCatalogQuery(
    { q: ' kettle ', minPrice: '10', maxPrice: '200', limit: '5' },
    ['kitchen']
  );
  assert.equal(parsed.q, 'kettle');
  assert.equal(parsed.minPrice, 10);
  assert.equal(parsed.maxPrice, 200);
  assert.equal(parsed.limit, 5);

  assert.throws(
    () => parseCatalogQuery({ q: ['one', 'two'] }, ['kitchen']),
    (error) => error instanceof ValidationError && error.field === 'q'
  );
  assert.throws(
    () => parseCatalogQuery({ category: 'unknown' }, ['kitchen']),
    (error) => error instanceof ValidationError && error.field === 'category'
  );
  assert.throws(
    () => parseCatalogQuery({ minPrice: '20', maxPrice: '10' }, ['kitchen']),
    (error) => error instanceof ValidationError && error.field === 'minPrice'
  );
});

test('ownership creation accepts only canonical, bounded fields', () => {
  const result = validateOwnershipCreate({
    productId: 'morrow-k2',
    purchaseDate: '2024-01-01',
    purchasePrice: 119,
    expectedLifespanMonths: 84,
    condition: 'Good',
    status: 'Active',
    notes: '  Replaced the seal once.  ',
  });
  assert.equal(result.productId, 'morrow-k2');
  assert.equal(result.notes, 'Replaced the seal once.');

  assert.throws(
    () =>
      validateOwnershipCreate({
        productId: 'morrow-k2',
        purchaseDate: '2024-01-01',
        expectedLifespanMonths: -5,
      }),
    (error) =>
      error instanceof ValidationError && error.field === 'expectedLifespanMonths'
  );
  assert.throws(
    () =>
      validateOwnershipCreate({
        productId: 'morrow-k2',
        purchaseDate: '2024-01-01',
        admin: true,
      }),
    (error) => error instanceof ValidationError && error.field === 'admin'
  );
});

test('ownership patches enforce date relationships', () => {
  const existing = {
    purchaseDate: '2024-01-01',
    lastUsedAt: '2024-06-01',
  };
  assert.deepEqual(validateOwnershipPatch({ status: 'Being repaired' }, existing), {
    status: 'Being repaired',
  });
  assert.throws(
    () => validateOwnershipPatch({ purchaseDate: '2025-01-01' }, existing),
    (error) => error instanceof ValidationError && error.field === 'lastUsedAt'
  );
});
