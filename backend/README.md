# WorthIt? local-development API

This Express API supports an honest, self-contained WorthIt? hackathon demo. Its catalog contains 15 real products available in the Australian market, with official manufacturer product, specification, price, warranty and release source URLs where available. AUD prices are point-in-time snapshots checked on 2026-07-11, not live quotes.

The shared product source is [`frontend/src/data/productCatalog.json`](../frontend/src/data/productCatalog.json). Catalog records are returned as real product data with `isRealProduct: true`, `isDemoData: false` and `provenance: "official_manufacturer_website"`. `backend/data.json` remains solely the local store for users and ownership records; it does not store products or reviews.

The API does not scrape Reddit or any external review source. Its 120 generated synthetic review scenarios—eight per product—exist only to exercise review-oriented UI and API paths. They are explicitly marked `isDemoData: true`, `isSynthetic: true` and `provenance: "synthetic_demo"`, and are excluded from community ratings and review counts. They are not real customer testimony and must not be deployed as community content.

## Run locally

Requirements:

- Node.js 18 or newer.
- npm.
- A writable local directory for `data.json`.

Install and run:

```sh
npm install
npm start
```

The API listens on `http://localhost:3001` by default. The server reads these environment variables:

- `NODE_ENV`: set to `development` locally and `production` in production.
- `PORT`: optional; defaults to `3001`.
- `APP_ORIGIN`: comma-separated browser origins; defaults to `http://localhost:3000`.
- `JWT_SECRET`: at least 32 characters. A clearly local-only fallback is used outside production; production has no fallback.
- `DATA_FILE`: optional JSON data path; defaults to `backend/data.json`.

The repository includes [.env.example](./.env.example), but the API intentionally has no dotenv dependency. Export variables through the shell or process manager.

## Local account authentication

Sign-in uses a username or email plus a password. Creating an account is a two-step flow so the account is not persisted until its phone number is verified:

1. `POST /api/auth/register/start` accepts `email`, `username`, `password` and `phone`, then returns an OTP challenge.
2. `POST /api/auth/register/verify` accepts `challengeId` and `code`, creates the account, and returns a local bearer token.
3. `POST /api/auth/login` accepts `identifier` (either the username or email) and `password`.

Emails and usernames are unique and compared case-insensitively. Usernames are stored in lowercase. Passwords must contain 8 to 128 characters and are stored as salted scrypt records using Node's built-in cryptography APIs. Unsuccessful login attempts are limited to five per identifier in a 15-minute window. Login failures use one generic message whether or not the account exists.

Phone input must include a country code. Formatting characters are removed and the stored value uses E.164 form. API responses never contain the raw phone number; challenge and authenticated-user responses contain only a masked value.

When `NODE_ENV` is anything other than `production`:

- No SMS is sent.
- The fixed code is `123456`.
- A challenge lasts five minutes.
- Resends have a 30-second per-number cooldown.
- Five incorrect attempts invalidate the challenge.
- Challenges live only in server memory and disappear on restart.

When `NODE_ENV=production`, registration fails closed with `503 otp_provider_not_configured` before account data is inspected or written. The development code is not accepted. This is deliberate: production phone verification still requires Supabase Auth and a configured SMS provider. Credential login additionally requires a configured `JWT_SECRET`.

Example:

```sh
curl -X POST http://localhost:3001/api/auth/register/start \
  -H 'Content-Type: application/json' \
  -d '{"email":"member@example.com","username":"careful_buyer","password":"correct horse battery staple","phone":"+61412345678"}'

curl -X POST http://localhost:3001/api/auth/register/verify \
  -H 'Content-Type: application/json' \
  -d '{"challengeId":"CHALLENGE_FROM_FIRST_RESPONSE","code":"123456"}'

curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"careful_buyer","password":"correct horse battery staple"}'
```

The older `POST /api/auth/otp/request` and `POST /api/auth/otp/verify` routes remain for local-demo compatibility. Their challenges are scoped separately and cannot be exchanged through the registration verification route. They cannot be used to bypass password login on a credential account.

## Endpoints

Public reads:

- `GET /api/health`
- `GET /api/categories`
- `GET /api/catalog`
- `GET /api/search?q=kettle`
- `GET /api/products/:id`

Catalog filters are `q`, `category`, `minPrice`, `maxPrice`, `minRating`, `minReviews`, `minLifespanMonths`, `minRepairability`, `sort`, `limit` and `offset`. Unknown or duplicated query fields are rejected. Sort values are `most-reviewed`, `highest-rated`, `recently-added`, `newest-release`, `longest-lifespan`, `trending` and `most-saved`.

Local authentication:

- `POST /api/auth/register/start`
- `POST /api/auth/register/verify`
- `POST /api/auth/login`
- `POST /api/auth/otp/request`
- `POST /api/auth/otp/verify`
- `GET /api/auth/session` with `Authorization: Bearer TOKEN`

`POST /api/register`, `POST /api/register/verify` and `POST /api/login` are retained as aliases for the corresponding canonical routes.

Private ownership:

- `GET /api/ownership`
- `POST /api/ownership`
- `PATCH /api/ownership/:id`
- `DELETE /api/ownership/:id`
- `GET /api/products/:id/purchase-score`

`/api/inventory` aliases are retained for list/create/update/delete compatibility. Every ownership operation filters by the authenticated local user id.

Example ownership body:

```json
{
  "productId": "breville-bes875",
  "purchaseDate": "2024-01-01",
  "purchasePrice": 749,
  "expectedLifespanMonths": 96,
  "userAdjustedLifespanMonths": null,
  "condition": "Good",
  "status": "Active",
  "lastUsedAt": "2026-07-10",
  "notes": "Replaced the group-head seal once."
}
```

The 96-month expected lifespan in this example is the owner's estimate for their specific item, not a manufacturer claim.

The purchase score implements the prompt's deterministic 0–100 formula in `scoring.js`, returns all positive and negative factors, identifies the owned item used in the calculation, and always includes the financial-guidance disclaimer.

## Verification

```sh
npm run check
npm test
```

Tests use Node's built-in test runner and cover phone-verified registration, username/email login, salted scrypt records, login throttling, OTP flow isolation, production OTP safeguards, malformed tokens, input validation, fixture labelling, exclusion of synthetic reviews from community aggregation, lifespan calculations, scoring thresholds and score clamping.

## Deliberate limitations

This backend is a local, single-process demonstration—not production infrastructure:

- Product reads come from the shared real-product catalog in `frontend/src/data/productCatalog.json`; its official-source URLs and 2026-07-11 AUD price snapshots are static and require manual rechecking. Review reads include 120 clearly labelled generated synthetic scenarios, which are excluded from community ratings and review counts.
- User and ownership data alone use the local atomic `data.json` file. There is no multi-process locking, migration system, backup strategy or Row Level Security.
- Bearer tokens are local HMAC tokens without revocation.
- OTP challenges and pending registrations are in memory and no SMS is sent. A server restart invalidates both.
- Review submission, voting, discussion, reports and moderation writes are not implemented here.
- Supabase Auth, Postgres, RLS policies, production SMS configuration and production seed separation remain required before deployment.
