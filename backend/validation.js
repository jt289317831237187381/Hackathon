class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.code = 'validation_error';
    this.field = field;
  }
}

const CATALOG_SORTS = Object.freeze([
  'most-reviewed',
  'highest-rated',
  'recently-added',
  'newest-release',
  'longest-lifespan',
  'trending',
  'most-saved',
]);

const OWNERSHIP_CONDITIONS = Object.freeze([
  'New',
  'Excellent',
  'Good',
  'Fair',
  'Poor',
  'Damaged',
]);

const OWNERSHIP_STATUSES = Object.freeze([
  'Active',
  'Damaged',
  'Being repaired',
  'Replaced',
  'Sold',
  'Donated',
  'Recycled',
  'Disposed',
]);

const OWNERSHIP_CREATE_FIELDS = Object.freeze([
  'productId',
  'purchaseDate',
  'purchasePrice',
  'expectedLifespanMonths',
  'userAdjustedLifespanMonths',
  'condition',
  'status',
  'lastUsedAt',
  'notes',
]);

const OWNERSHIP_PATCH_FIELDS = Object.freeze(
  OWNERSHIP_CREATE_FIELDS.filter((field) => field !== 'productId')
);

function assertPlainObject(value, label = 'Request body') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${label} must be a JSON object.`);
  }
}

function assertAllowedKeys(value, allowedKeys, label = 'Request body') {
  const unexpected = Object.keys(value).filter((key) => !allowedKeys.includes(key));
  if (unexpected.length) {
    throw new ValidationError(
      `${label} contains unsupported field${unexpected.length === 1 ? '' : 's'}: ${unexpected.join(
        ', '
      )}.`,
      unexpected[0]
    );
  }
}

function readSingleQueryValue(query, field) {
  const value = query[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be supplied once as text.`, field);
  }
  return value;
}

function readTrimmedString(value, field, { required = false, maxLength = 200 } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new ValidationError(`${field} is required.`, field);
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be text.`, field);
  }

  const trimmed = value.trim();
  if (required && !trimmed) {
    throw new ValidationError(`${field} is required.`, field);
  }
  if (trimmed.length > maxLength) {
    throw new ValidationError(
      `${field} must be ${maxLength} characters or fewer.`,
      field
    );
  }
  return trimmed;
}

function parseNumber(
  value,
  field,
  { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, integer = false } = {}
) {
  if (value === undefined || value === null || value === '') return undefined;
  const numeric = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numeric) || (integer && !Number.isInteger(numeric))) {
    throw new ValidationError(
      `${field} must be ${integer ? 'a whole number' : 'a number'}.`,
      field
    );
  }
  if (numeric < min || numeric > max) {
    throw new ValidationError(
      `${field} must be between ${min} and ${max}.`,
      field
    );
  }
  return numeric;
}

function parseIsoDate(value, field, { nullable = false, notFuture = true } = {}) {
  if (value === undefined) return undefined;
  if (value === null && nullable) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${field} must use YYYY-MM-DD format.`, field);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ValidationError(`${field} must be a real calendar date.`, field);
  }
  if (notFuture) {
    const today = new Date().toISOString().slice(0, 10);
    if (value > today) {
      throw new ValidationError(`${field} cannot be in the future.`, field);
    }
  }
  return value;
}

function parseCatalogQuery(query, allowedCategoryIds) {
  assertPlainObject(query, 'Query');
  const allowedFields = [
    'q',
    'category',
    'minPrice',
    'maxPrice',
    'minRating',
    'minReviews',
    'minLifespanMonths',
    'minRepairability',
    'sort',
    'limit',
    'offset',
  ];
  assertAllowedKeys(query, allowedFields, 'Query');

  const q = readTrimmedString(readSingleQueryValue(query, 'q'), 'q', {
    maxLength: 100,
  });
  const category = readTrimmedString(
    readSingleQueryValue(query, 'category'),
    'category',
    { maxLength: 50 }
  );
  if (category && !allowedCategoryIds.includes(category)) {
    throw new ValidationError('category is not recognised.', 'category');
  }

  const sort =
    readTrimmedString(readSingleQueryValue(query, 'sort'), 'sort', {
      maxLength: 40,
    }) || 'trending';
  if (!CATALOG_SORTS.includes(sort)) {
    throw new ValidationError(
      `sort must be one of: ${CATALOG_SORTS.join(', ')}.`,
      'sort'
    );
  }

  const minPrice = parseNumber(readSingleQueryValue(query, 'minPrice'), 'minPrice', {
    min: 0,
    max: 1000000,
  });
  const maxPrice = parseNumber(readSingleQueryValue(query, 'maxPrice'), 'maxPrice', {
    min: 0,
    max: 1000000,
  });
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new ValidationError('minPrice cannot be greater than maxPrice.', 'minPrice');
  }

  return {
    q: q || '',
    category: category || null,
    minPrice,
    maxPrice,
    minRating: parseNumber(
      readSingleQueryValue(query, 'minRating'),
      'minRating',
      { min: 1, max: 5 }
    ),
    minReviews: parseNumber(
      readSingleQueryValue(query, 'minReviews'),
      'minReviews',
      { min: 0, max: 1000000, integer: true }
    ),
    minLifespanMonths: parseNumber(
      readSingleQueryValue(query, 'minLifespanMonths'),
      'minLifespanMonths',
      { min: 1, max: 1200, integer: true }
    ),
    minRepairability: parseNumber(
      readSingleQueryValue(query, 'minRepairability'),
      'minRepairability',
      { min: 1, max: 5 }
    ),
    sort,
    limit:
      parseNumber(readSingleQueryValue(query, 'limit'), 'limit', {
        min: 1,
        max: 50,
        integer: true,
      }) ?? 20,
    offset:
      parseNumber(readSingleQueryValue(query, 'offset'), 'offset', {
        min: 0,
        max: 10000,
        integer: true,
      }) ?? 0,
  };
}

function normalizePhoneNumber(value) {
  if (typeof value !== 'string') {
    throw new ValidationError('phone must be text.', 'phone');
  }

  let normalized = value.trim();
  if (normalized.startsWith('00')) normalized = `+${normalized.slice(2)}`;
  normalized = normalized.replace(/[\s().-]/g, '');

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new ValidationError(
      'phone must include a country code and contain 8 to 15 digits, for example +61412345678.',
      'phone'
    );
  }
  return normalized;
}

function maskPhoneNumber(phone) {
  const visibleEnd = phone.slice(-4);
  const hiddenCount = Math.max(4, phone.length - 6);
  return `${phone.slice(0, 2)}${'•'.repeat(hiddenCount)}${visibleEnd}`;
}

function validateOtpRequest(body) {
  assertPlainObject(body);
  assertAllowedKeys(body, ['phone']);
  return { phone: normalizePhoneNumber(body.phone) };
}

function validateOtpVerification(body) {
  assertPlainObject(body);
  assertAllowedKeys(body, ['challengeId', 'code']);
  const challengeId = readTrimmedString(body.challengeId, 'challengeId', {
    required: true,
    maxLength: 36,
  });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(challengeId)) {
    throw new ValidationError('challengeId is invalid.', 'challengeId');
  }
  const code = readTrimmedString(body.code, 'code', {
    required: true,
    maxLength: 6,
  });
  if (!/^\d{6}$/.test(code)) {
    throw new ValidationError('code must contain exactly 6 digits.', 'code');
  }
  return { challengeId, code };
}

function normalizeEmail(value) {
  const email = readTrimmedString(value, 'email', {
    required: true,
    maxLength: 254,
  }).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('email must be a valid email address.', 'email');
  }
  return email;
}

function normalizeUsername(value) {
  const username = readTrimmedString(value, 'username', {
    required: true,
    maxLength: 30,
  }).toLowerCase();

  if (
    username.length < 3 ||
    !/^[a-z0-9](?:[a-z0-9_.-]*[a-z0-9])?$/.test(username)
  ) {
    throw new ValidationError(
      'username must be 3 to 30 characters and use letters, numbers, periods, underscores or hyphens.',
      'username'
    );
  }
  return username;
}

function validatePassword(value) {
  if (typeof value !== 'string') {
    throw new ValidationError('password must be text.', 'password');
  }
  if (value.length < 8) {
    throw new ValidationError(
      'password must contain at least 8 characters.',
      'password'
    );
  }
  if (value.length > 128 || Buffer.byteLength(value, 'utf8') > 256) {
    throw new ValidationError(
      'password must be 128 characters or fewer.',
      'password'
    );
  }
  return value;
}

function validateRegistrationStart(body) {
  assertPlainObject(body);
  assertAllowedKeys(body, ['email', 'username', 'password', 'phone']);
  return {
    email: normalizeEmail(body.email),
    username: normalizeUsername(body.username),
    password: validatePassword(body.password),
    phone: normalizePhoneNumber(body.phone),
  };
}

function validateRegistrationVerification(body) {
  return validateOtpVerification(body);
}

function validateLogin(body) {
  assertPlainObject(body);
  assertAllowedKeys(body, ['identifier', 'password']);
  const identifier = readTrimmedString(body.identifier, 'identifier', {
    required: true,
    maxLength: 254,
  }).toLowerCase();

  return {
    identifier,
    password: validatePassword(body.password),
  };
}

function parseEnum(value, field, allowedValues, defaultValue) {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'string' || !allowedValues.includes(value)) {
    throw new ValidationError(
      `${field} must be one of: ${allowedValues.join(', ')}.`,
      field
    );
  }
  return value;
}

function validateOwnershipCreate(body) {
  assertPlainObject(body);
  assertAllowedKeys(body, OWNERSHIP_CREATE_FIELDS);

  const productId = readTrimmedString(body.productId, 'productId', {
    required: true,
    maxLength: 80,
  });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productId)) {
    throw new ValidationError('productId must be a lowercase product slug.', 'productId');
  }

  const purchaseDate = parseIsoDate(body.purchaseDate, 'purchaseDate');
  if (!purchaseDate) {
    throw new ValidationError('purchaseDate is required.', 'purchaseDate');
  }
  const lastUsedAt = parseIsoDate(body.lastUsedAt, 'lastUsedAt', { nullable: true });
  if (lastUsedAt && lastUsedAt < purchaseDate) {
    throw new ValidationError('lastUsedAt cannot be before purchaseDate.', 'lastUsedAt');
  }

  return {
    productId,
    purchaseDate,
    purchasePrice:
      body.purchasePrice === null
        ? null
        : parseNumber(body.purchasePrice, 'purchasePrice', { min: 0, max: 1000000 }) ??
          null,
    expectedLifespanMonths: parseNumber(
      body.expectedLifespanMonths,
      'expectedLifespanMonths',
      { min: 1, max: 1200, integer: true }
    ),
    userAdjustedLifespanMonths:
      body.userAdjustedLifespanMonths === null
        ? null
        : parseNumber(
            body.userAdjustedLifespanMonths,
            'userAdjustedLifespanMonths',
            { min: 1, max: 1200, integer: true }
          ) ?? null,
    condition: parseEnum(body.condition, 'condition', OWNERSHIP_CONDITIONS, 'Good'),
    status: parseEnum(body.status, 'status', OWNERSHIP_STATUSES, 'Active'),
    lastUsedAt: lastUsedAt ?? null,
    notes:
      readTrimmedString(body.notes, 'notes', { maxLength: 1000 }) ?? '',
  };
}

function validateOwnershipPatch(body, existingItem) {
  assertPlainObject(body);
  assertAllowedKeys(body, OWNERSHIP_PATCH_FIELDS);
  if (Object.keys(body).length === 0) {
    throw new ValidationError('At least one editable field is required.');
  }

  const patch = {};
  if (Object.hasOwn(body, 'purchaseDate')) {
    patch.purchaseDate = parseIsoDate(body.purchaseDate, 'purchaseDate');
    if (!patch.purchaseDate) {
      throw new ValidationError('purchaseDate is required.', 'purchaseDate');
    }
  }
  if (Object.hasOwn(body, 'purchasePrice')) {
    patch.purchasePrice =
      body.purchasePrice === null
        ? null
        : parseNumber(body.purchasePrice, 'purchasePrice', { min: 0, max: 1000000 });
  }
  if (Object.hasOwn(body, 'expectedLifespanMonths')) {
    patch.expectedLifespanMonths = parseNumber(
      body.expectedLifespanMonths,
      'expectedLifespanMonths',
      { min: 1, max: 1200, integer: true }
    );
  }
  if (Object.hasOwn(body, 'userAdjustedLifespanMonths')) {
    patch.userAdjustedLifespanMonths =
      body.userAdjustedLifespanMonths === null
        ? null
        : parseNumber(
            body.userAdjustedLifespanMonths,
            'userAdjustedLifespanMonths',
            { min: 1, max: 1200, integer: true }
          );
  }
  if (Object.hasOwn(body, 'condition')) {
    patch.condition = parseEnum(
      body.condition,
      'condition',
      OWNERSHIP_CONDITIONS
    );
  }
  if (Object.hasOwn(body, 'status')) {
    patch.status = parseEnum(body.status, 'status', OWNERSHIP_STATUSES);
  }
  if (Object.hasOwn(body, 'lastUsedAt')) {
    patch.lastUsedAt = parseIsoDate(body.lastUsedAt, 'lastUsedAt', {
      nullable: true,
    });
  }
  if (Object.hasOwn(body, 'notes')) {
    patch.notes = readTrimmedString(body.notes, 'notes', { maxLength: 1000 }) ?? '';
  }

  const purchaseDate = patch.purchaseDate ?? existingItem.purchaseDate;
  const lastUsedAt = Object.hasOwn(patch, 'lastUsedAt')
    ? patch.lastUsedAt
    : existingItem.lastUsedAt;
  if (lastUsedAt && lastUsedAt < purchaseDate) {
    throw new ValidationError('lastUsedAt cannot be before purchaseDate.', 'lastUsedAt');
  }
  return patch;
}

function parsePositiveIntegerId(value, field = 'id') {
  if (!/^\d+$/.test(String(value))) {
    throw new ValidationError(`${field} must be a positive integer.`, field);
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ValidationError(`${field} must be a positive integer.`, field);
  }
  return id;
}

module.exports = {
  CATALOG_SORTS,
  OWNERSHIP_CONDITIONS,
  OWNERSHIP_STATUSES,
  ValidationError,
  maskPhoneNumber,
  normalizeEmail,
  normalizePhoneNumber,
  normalizeUsername,
  parseCatalogQuery,
  parsePositiveIntegerId,
  validateLogin,
  validateOtpRequest,
  validateOtpVerification,
  validateOwnershipCreate,
  validateOwnershipPatch,
  validatePassword,
  validateRegistrationStart,
  validateRegistrationVerification,
};
