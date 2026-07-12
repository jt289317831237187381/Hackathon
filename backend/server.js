const express = require('express');
const {
  CredentialError,
  DEV_OTP_CODE,
  OtpError,
  authenticate,
  createToken,
  hashPassword,
  loginAttemptLimiter,
  otpService,
  pendingRegistrationService,
  verifyPassword,
} = require('./auth');
const { DatabaseError, load, update } = require('./db');
const {
  DEMO_DATA_NOTICE,
  categories,
  demoProducts,
  getCommunitySummary,
  getProductById,
  getProductWithCommunity,
  getReviewsForProduct,
} = require('./demo-fixtures');
const {
  calculateLifespanDetails,
  calculatePersonalPurchaseScore,
} = require('./scoring');
const {
  ValidationError,
  maskPhoneNumber,
  parseCatalogQuery,
  parsePositiveIntegerId,
  validateLogin,
  validateOtpRequest,
  validateOtpVerification,
  validateOwnershipCreate,
  validateOwnershipPatch,
  validateRegistrationStart,
  validateRegistrationVerification,
} = require('./validation');

const DEFAULT_PORT = 3001;
const DEFAULT_ORIGIN = 'http://localhost:3000';

function getAllowedOrigins() {
  return (process.env.APP_ORIGIN || DEFAULT_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function demoMeta(extra = {}) {
  return {
    isDemoData: true,
    productDataIsReal: true,
    productProvenance: 'official_manufacturer_website',
    syntheticReviewsExcludedFromCommunityMetrics: true,
    notice: DEMO_DATA_NOTICE,
    ...extra,
  };
}

function sendError(res, status, code, message, details = null) {
  const error = { code, message };
  if (details !== null) error.details = details;
  return res.status(status).json({ error });
}

function requireJson(req, res, next) {
  if (!req.is('application/json')) {
    return sendError(
      res,
      415,
      'unsupported_media_type',
      'Content-Type must be application/json.'
    );
  }
  return next();
}

function requireActiveLocalUser(req, res, next) {
  const data = load();
  const user = data.users.find(
    (candidate) => String(candidate.id) === String(req.userId)
  );

  if (!user || user.phoneVerified !== true) {
    return sendError(
      res,
      401,
      'local_user_not_found',
      'The local-development user no longer exists.'
    );
  }
  if ((user.accountStatus || 'active') !== 'active') {
    return sendError(
      res,
      403,
      'account_not_active',
      'This account is not active.'
    );
  }
  req.localUser = user;
  return next();
}

function publicUser(user) {
  const result = {
    id: user.id,
    email: user.email || null,
    username: user.username || null,
    displayName: user.displayName || user.username || `WorthIt? member ${user.id}`,
    phoneVerified: user.phoneVerified === true,
    role: user.role || 'user',
    accountStatus: user.accountStatus || 'active',
    createdAt: user.createdAt,
  };
  if (typeof user.phone === 'string') {
    result.maskedPhone = maskPhoneNumber(user.phone);
  }
  return result;
}

function findRegistrationConflict(data, registration) {
  if (
    data.users.some(
      (user) =>
        typeof user.email === 'string' &&
        user.email.toLowerCase() === registration.email
    )
  ) {
    return 'email';
  }
  if (
    data.users.some(
      (user) =>
        typeof user.username === 'string' &&
        user.username.toLowerCase() === registration.username
    )
  ) {
    return 'username';
  }
  if (data.users.some((user) => user.phone === registration.phone)) {
    return 'phone';
  }
  return null;
}

function throwRegistrationConflict(field) {
  throw new CredentialError(`That ${field} is already registered.`, {
    status: 409,
    code: 'account_already_exists',
    details: { field },
  });
}

function validateProductId(value) {
  if (
    typeof value !== 'string' ||
    value.length > 80 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  ) {
    throw new ValidationError('Product id is invalid.', 'id');
  }
  return value;
}

function sortCatalog(products, sort) {
  const sorted = [...products];
  const numberOr = (value, fallback) =>
    Number.isFinite(value) ? value : fallback;
  const dateOr = (value, fallback) => {
    const timestamp = value ? new Date(value).getTime() : NaN;
    return Number.isFinite(timestamp) ? timestamp : fallback;
  };
  const releaseTimestamp = (product) => {
    const releaseDate = dateOr(product.releaseDate, null);
    if (releaseDate !== null) return releaseDate;
    return Number.isInteger(product.releaseYear)
      ? Date.UTC(product.releaseYear, 0, 1)
      : Number.NEGATIVE_INFINITY;
  };

  sorted.sort((left, right) => {
    let comparison = 0;

    switch (sort) {
      case 'most-reviewed':
        comparison =
          numberOr(right.reviewCount, 0) - numberOr(left.reviewCount, 0);
        break;
      case 'highest-rated':
        comparison =
          numberOr(right.communityRating, -1) -
          numberOr(left.communityRating, -1);
        break;
      case 'recently-added':
        comparison =
          dateOr(right.createdAt, Number.NEGATIVE_INFINITY) -
          dateOr(left.createdAt, Number.NEGATIVE_INFINITY);
        break;
      case 'newest-release':
        comparison = releaseTimestamp(right) - releaseTimestamp(left);
        break;
      case 'longest-lifespan':
        comparison =
          numberOr(right.expectedLifespanMonths, Number.NEGATIVE_INFINITY) -
          numberOr(left.expectedLifespanMonths, Number.NEGATIVE_INFINITY);
        break;
      case 'most-saved':
        comparison =
          numberOr(right.demoSavedCount, 0) -
          numberOr(left.demoSavedCount, 0);
        break;
      case 'trending':
      default:
        comparison =
          numberOr(left.trendingRank, Number.POSITIVE_INFINITY) -
          numberOr(right.trendingRank, Number.POSITIVE_INFINITY);
        break;
    }

    return comparison || left.name.localeCompare(right.name);
  });
  return sorted;
}

function queryCatalog(filters) {
  const normalizedQuery = filters.q.toLowerCase();
  let products = demoProducts.map(getProductWithCommunity);

  if (normalizedQuery) {
    products = products.filter((product) =>
      [
        product.name,
        product.brand,
        product.model,
        product.categoryId,
        product.categoryLabel,
        product.summary,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }
  if (filters.category) {
    products = products.filter(
      (product) => product.categoryId === filters.category
    );
  }
  if (filters.minPrice !== undefined) {
    products = products.filter(
      (product) =>
        Number.isFinite(product.currentPrice) &&
        product.currentPrice >= filters.minPrice
    );
  }
  if (filters.maxPrice !== undefined) {
    products = products.filter(
      (product) =>
        Number.isFinite(product.currentPrice) &&
        product.currentPrice <= filters.maxPrice
    );
  }
  if (filters.minRating !== undefined) {
    products = products.filter(
      (product) =>
        product.communityRating !== null &&
        product.communityRating >= filters.minRating
    );
  }
  if (filters.minReviews !== undefined) {
    products = products.filter(
      (product) => product.reviewCount >= filters.minReviews
    );
  }
  if (filters.minLifespanMonths !== undefined) {
    products = products.filter(
      (product) =>
        Number.isFinite(product.expectedLifespanMonths) &&
        product.expectedLifespanMonths >= filters.minLifespanMonths
    );
  }
  if (filters.minRepairability !== undefined) {
    products = products.filter(
      (product) =>
        Number.isFinite(product.repairabilityRating) &&
        product.repairabilityRating >= filters.minRepairability
    );
  }

  const sorted = sortCatalog(products, filters.sort);
  const total = sorted.length;
  return {
    products: sorted.slice(filters.offset, filters.offset + filters.limit),
    total,
  };
}

function getSubstitutes(product, limit = 3) {
  return demoProducts
    .filter(
      (candidate) =>
        candidate.id !== product.id &&
        candidate.categoryId === product.categoryId
    )
    .map(getProductWithCommunity)
    .sort((left, right) => {
      const ratingDifference =
        (right.communityRating || 0) - (left.communityRating || 0);
      const rightLifespan = Number.isFinite(right.expectedLifespanMonths)
        ? right.expectedLifespanMonths
        : Number.NEGATIVE_INFINITY;
      const leftLifespan = Number.isFinite(left.expectedLifespanMonths)
        ? left.expectedLifespanMonths
        : Number.NEGATIVE_INFINITY;
      return (
        ratingDifference ||
        rightLifespan - leftLifespan ||
        left.name.localeCompare(right.name)
      );
    })
    .slice(0, limit)
    .map((candidate) => ({
      ...candidate,
      reason:
        Number.isFinite(candidate.expectedLifespanMonths) &&
        (!Number.isFinite(product.expectedLifespanMonths) ||
          candidate.expectedLifespanMonths > product.expectedLifespanMonths)
          ? 'Same category with a longer evidence-backed expected lifespan.'
          : 'Same category with specifications linked to an official manufacturer source.',
    }));
}

function getUserOwnedItems(userId) {
  return load().ownedItems.filter(
    (item) => String(item.userId) === String(userId)
  );
}

function enrichOwnedItem(item, asOfDate = new Date()) {
  const product = item.productId ? getProductById(item.productId) : null;
  let lifespan = null;
  let lifespanError = null;

  try {
    lifespan = calculateLifespanDetails(item, asOfDate);
  } catch (error) {
    lifespanError = error.message;
  }

  return {
    ...item,
    productName: item.productName || product?.name || 'Unknown product',
    categoryId: item.categoryId || product?.categoryId || null,
    product: product ? getProductWithCommunity(product) : null,
    lifespan,
    lifespanError,
  };
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    const origin = req.headers.origin;
    const allowedOrigins = getAllowedOrigins();
    const originAllowed =
      !origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin);

    if (!originAllowed) {
      return sendError(
        res,
        403,
        'origin_not_allowed',
        'This browser origin is not allowed to call the API.'
      );
    }
    if (origin) {
      res.setHeader(
        'Access-Control-Allow-Origin',
        allowedOrigins.includes('*') ? '*' : origin
      );
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PATCH, DELETE, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  });

  app.use(express.json({ limit: '32kb', strict: true }));

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'WorthIt? local-development API',
      dataMode: 'official-product-catalog-with-synthetic-review-fixtures',
      productionReady: false,
    });
  });

  app.get('/api/categories', (req, res) => {
    res.json({ meta: demoMeta(), categories });
  });

  app.get('/api/catalog', (req, res) => {
    const filters = parseCatalogQuery(
      req.query,
      categories.map((category) => category.id)
    );
    const result = queryCatalog(filters);

    res.json({
      meta: demoMeta({
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
      }),
      filters,
      products: result.products,
    });
  });

  app.get('/api/search', (req, res) => {
    const filters = parseCatalogQuery(
      req.query,
      categories.map((category) => category.id)
    );
    if (!filters.q) {
      throw new ValidationError('q is required for product search.', 'q');
    }
    const result = queryCatalog(filters);

    res.json({
      meta: demoMeta({
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
      }),
      query: filters.q,
      products: result.products,
    });
  });

  app.get('/api/products/:id', (req, res) => {
    const productId = validateProductId(req.params.id);
    const product = getProductById(productId);
    if (!product) {
      return sendError(res, 404, 'product_not_found', 'Product not found.');
    }

    return res.json({
      meta: demoMeta(),
      product: getProductWithCommunity(product),
      reviews: getReviewsForProduct(product.id),
      substitutes: getSubstitutes(product),
    });
  });

  app.post(
    ['/api/auth/register/start', '/api/register'],
    requireJson,
    async (req, res) => {
      // Local development has a fixed OTP. Production must use a configured
      // SMS provider and therefore fails before inspecting account data.
      otpService.assertEnabled();
      const registration = validateRegistrationStart(req.body);
      const conflict = findRegistrationConflict(load(), registration);
      if (conflict) throwRegistrationConflict(conflict);

      const passwordHash = await hashPassword(registration.password);
      const challenge = otpService.request(registration.phone, 'registration');
      pendingRegistrationService.store(challenge, {
        email: registration.email,
        username: registration.username,
        phone: registration.phone,
        passwordHash,
      });

      res.setHeader('Cache-Control', 'no-store');
      res.setHeader(
        'Retry-After',
        String(Math.ceil(otpService.cooldownMs / 1000))
      );
      return res.status(202).json({
        challengeId: challenge.challengeId,
        maskedPhone: maskPhoneNumber(registration.phone),
        expiresAt: new Date(challenge.expiresAt).toISOString(),
        expiresInSeconds: Math.ceil(otpService.ttlMs / 1000),
        resendAfterSeconds: Math.ceil(otpService.cooldownMs / 1000),
        developmentCode: DEV_OTP_CODE,
        developmentOnly: true,
        message:
          'No SMS was sent. Enter the fixed local-development code shown in this response to finish creating the account.',
      });
    }
  );

  app.post(
    ['/api/auth/register/verify', '/api/register/verify'],
    requireJson,
    (req, res) => {
      const { challengeId, code } = validateRegistrationVerification(req.body);
      const { phone } = otpService.verify(
        challengeId,
        code,
        'registration'
      );
      const registration = pendingRegistrationService.consume(
        challengeId,
        phone
      );
      const now = new Date().toISOString();

      const user = update((data) => {
        const conflict = findRegistrationConflict(data, registration);
        if (conflict) throwRegistrationConflict(conflict);

        const account = {
          id: data.nextUserId++,
          email: registration.email,
          username: registration.username,
          passwordHash: registration.passwordHash,
          phone: registration.phone,
          displayName: registration.username,
          avatarUrl: null,
          bio: '',
          phoneVerified: true,
          role: 'user',
          accountStatus: 'active',
          createdAt: now,
          updatedAt: now,
        };
        data.users.push(account);
        return account;
      });

      const token = createToken({ userId: user.id, phoneVerified: true });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(201).json({
        token,
        tokenType: 'Bearer',
        expiresInSeconds: 604800,
        authMode: 'local-development-password',
        user: publicUser(user),
      });
    }
  );

  app.post(
    ['/api/auth/login', '/api/login'],
    requireJson,
    async (req, res) => {
      const { identifier, password } = validateLogin(req.body);
      const user = load().users.find(
        (candidate) =>
          (typeof candidate.email === 'string' &&
            candidate.email.toLowerCase() === identifier) ||
          (typeof candidate.username === 'string' &&
            candidate.username.toLowerCase() === identifier)
      );
      // Email and username aliases for the same account share one throttle.
      const rateLimitKey = user ? `user:${user.id}` : `identifier:${identifier}`;
      loginAttemptLimiter.assertAllowed(rateLimitKey);
      const validPassword = await verifyPassword(password, user?.passwordHash);

      if (!user || !validPassword) {
        loginAttemptLimiter.recordFailure(rateLimitKey);
        throw new CredentialError(
          'The username/email or password is incorrect.'
        );
      }
      if (user.phoneVerified !== true) {
        throw new CredentialError('Phone verification is required.', {
          status: 403,
          code: 'phone_verification_required',
        });
      }
      if ((user.accountStatus || 'active') !== 'active') {
        throw new CredentialError('This account is not active.', {
          status: 403,
          code: 'account_not_active',
        });
      }

      loginAttemptLimiter.clear(rateLimitKey);
      const token = createToken({ userId: user.id, phoneVerified: true });
      res.setHeader('Cache-Control', 'no-store');
      return res.json({
        token,
        tokenType: 'Bearer',
        expiresInSeconds: 604800,
        authMode: 'local-development-password',
        user: publicUser(user),
      });
    }
  );

  app.post('/api/auth/otp/request', requireJson, (req, res) => {
    const { phone } = validateOtpRequest(req.body);
    const challenge = otpService.request(phone);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', String(Math.ceil(otpService.cooldownMs / 1000)));

    return res.status(202).json({
      challengeId: challenge.challengeId,
      maskedPhone: maskPhoneNumber(phone),
      expiresAt: new Date(challenge.expiresAt).toISOString(),
      expiresInSeconds: Math.ceil(otpService.ttlMs / 1000),
      resendAfterSeconds: Math.ceil(otpService.cooldownMs / 1000),
      developmentCode: DEV_OTP_CODE,
      developmentOnly: true,
      message:
        'No SMS was sent. Enter the fixed local-development code shown in this response.',
    });
  });

  app.post('/api/auth/otp/verify', requireJson, (req, res) => {
    const { challengeId, code } = validateOtpVerification(req.body);
    const { phone } = otpService.verify(challengeId, code, 'legacy-auth');
    const now = new Date().toISOString();
    let isNewUser = false;

    const user = update((data) => {
      let existing = data.users.find((candidate) => candidate.phone === phone);
      if (existing?.passwordHash) {
        throw new CredentialError(
          'This account uses username/email and password sign-in.',
          { status: 409, code: 'password_login_required' }
        );
      }
      if (!existing) {
        const id = data.nextUserId++;
        existing = {
          id,
          email: null,
          username: null,
          phone,
          displayName: `WorthIt? member ${id}`,
          avatarUrl: null,
          bio: '',
          phoneVerified: true,
          role: 'user',
          accountStatus: 'active',
          createdAt: now,
          updatedAt: now,
        };
        data.users.push(existing);
        isNewUser = true;
      } else {
        existing.phoneVerified = true;
        existing.updatedAt = now;
      }
      return existing;
    });

    const token = createToken({ userId: user.id, phoneVerified: true });
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      token,
      tokenType: 'Bearer',
      expiresInSeconds: 604800,
      isNewUser,
      authMode: 'local-development-otp',
      user: publicUser(user),
    });
  });

  app.get(
    '/api/auth/session',
    authenticate,
    requireActiveLocalUser,
    (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        authMode: req.localUser.passwordHash
          ? 'local-development-password'
          : 'local-development-otp',
        user: publicUser(req.localUser),
      });
    }
  );

  app.get(
    ['/api/ownership', '/api/inventory'],
    authenticate,
    requireActiveLocalUser,
    (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      const items = getUserOwnedItems(req.userId).map((item) =>
        enrichOwnedItem(item)
      );

      if (req.path === '/api/inventory') return res.json(items);
      return res.json({ items, total: items.length });
    }
  );

  app.post(
    ['/api/ownership', '/api/inventory'],
    requireJson,
    authenticate,
    requireActiveLocalUser,
    (req, res) => {
      const input = validateOwnershipCreate(req.body);
      const product = getProductById(input.productId);
      if (!product) {
        return sendError(res, 404, 'product_not_found', 'Product not found.');
      }

      const now = new Date().toISOString();
      const item = update((data) => {
        const record = {
          id: data.nextOwnedItemId++,
          userId: req.userId,
          ...input,
          productName: product.name,
          categoryId: product.categoryId,
          expectedLifespanMonths:
            input.expectedLifespanMonths ?? product.expectedLifespanMonths,
          createdAt: now,
          updatedAt: now,
        };
        data.ownedItems.push(record);
        return record;
      });

      res.setHeader('Cache-Control', 'no-store');
      return res.status(201).json({ item: enrichOwnedItem(item) });
    }
  );

  app.patch(
    ['/api/ownership/:id', '/api/inventory/:id'],
    requireJson,
    authenticate,
    requireActiveLocalUser,
    (req, res) => {
      const id = parsePositiveIntegerId(req.params.id);
      const data = load();
      const existing = data.ownedItems.find(
        (item) => item.id === id && String(item.userId) === String(req.userId)
      );
      if (!existing) {
        return sendError(
          res,
          404,
          'owned_item_not_found',
          'Owned item not found.'
        );
      }
      const patch = validateOwnershipPatch(req.body, existing);

      const updatedItem = update((latestData) => {
        const item = latestData.ownedItems.find(
          (candidate) =>
            candidate.id === id &&
            String(candidate.userId) === String(req.userId)
        );
        if (!item) return null;
        Object.assign(item, patch, { updatedAt: new Date().toISOString() });
        return item;
      });
      if (!updatedItem) {
        return sendError(
          res,
          409,
          'owned_item_changed',
          'The owned item changed before it could be updated.'
        );
      }

      res.setHeader('Cache-Control', 'no-store');
      return res.json({ item: enrichOwnedItem(updatedItem) });
    }
  );

  app.delete(
    ['/api/ownership/:id', '/api/inventory/:id'],
    authenticate,
    requireActiveLocalUser,
    (req, res) => {
      const id = parsePositiveIntegerId(req.params.id);
      let removed = false;

      update((data) => {
        const index = data.ownedItems.findIndex(
          (item) =>
            item.id === id && String(item.userId) === String(req.userId)
        );
        if (index !== -1) {
          data.ownedItems.splice(index, 1);
          removed = true;
        }
      });
      if (!removed) {
        return sendError(
          res,
          404,
          'owned_item_not_found',
          'Owned item not found.'
        );
      }
      return res.status(204).send();
    }
  );

  app.get(
    '/api/products/:id/purchase-score',
    authenticate,
    requireActiveLocalUser,
    (req, res) => {
      const productId = validateProductId(req.params.id);
      const product = getProductById(productId);
      if (!product) {
        return sendError(res, 404, 'product_not_found', 'Product not found.');
      }

      const community = getCommunitySummary(product.id);
      const ownedItems = getUserOwnedItems(req.userId);
      const result = calculatePersonalPurchaseScore({
        product,
        communityRating: community.averageRating,
        reviewCount: community.reviewCount,
        ownedItems,
      });
      const shouldKeepExisting = result.factors.some((factor) =>
        [
          'active-alternative-over-half-remaining',
          'alternative-20-to-50-percent-remaining',
        ].includes(factor.code)
      );

      res.setHeader('Cache-Control', 'no-store');
      return res.json({
        meta: demoMeta({
          scoreUsesPrivateLocalOwnershipData: true,
          productionReady: false,
        }),
        product: {
          id: product.id,
          name: product.name,
          categoryId: product.categoryId,
        },
        community,
        purchaseScore: result,
        recommendation: shouldKeepExisting
          ? {
              type: 'keep-what-you-have',
              label: 'Keep what you already have',
            }
          : null,
      });
    }
  );

  app.use((req, res) =>
    sendError(res, 404, 'route_not_found', 'API route not found.')
  );

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ValidationError) {
      return sendError(res, error.status, error.code, error.message, {
        field: error.field,
      });
    }
    if (error instanceof OtpError) {
      if (error.details?.retryAfterSeconds) {
        res.setHeader('Retry-After', String(error.details.retryAfterSeconds));
      }
      return sendError(
        res,
        error.status,
        error.code,
        error.message,
        error.details
      );
    }
    if (error instanceof CredentialError) {
      if (error.details?.retryAfterSeconds) {
        res.setHeader('Retry-After', String(error.details.retryAfterSeconds));
      }
      return sendError(
        res,
        error.status,
        error.code,
        error.message,
        error.details
      );
    }
    if (error instanceof DatabaseError) {
      console.error(error.message);
      return sendError(
        res,
        error.status,
        error.code,
        'The local-development data store is unavailable.'
      );
    }
    if (error?.type === 'entity.parse.failed') {
      return sendError(
        res,
        400,
        'invalid_json',
        'Request body contains invalid JSON.'
      );
    }
    if (error?.type === 'entity.too.large') {
      return sendError(
        res,
        413,
        'request_too_large',
        'Request body must be 32 KB or smaller.'
      );
    }

    console.error(error);
    return sendError(
      res,
      500,
      'internal_error',
      'An unexpected server error occurred.'
    );
  });

  return app;
}

function parsePort(value) {
  const port = Number(value ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a whole number between 1 and 65535.');
  }
  return port;
}

function start(portValue = process.env.PORT) {
  const port = parsePort(portValue);
  const server = app.listen(port, () => {
    console.log(`WorthIt? local-development API listening on port ${port}`);
  });

  const shutdown = () => {
    server.close((error) => {
      if (error) {
        console.error(error);
        process.exitCode = 1;
      }
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  return server;
}

const app = createApp();

if (require.main === module) start();

module.exports = {
  app,
  createApp,
  queryCatalog,
  start,
};
