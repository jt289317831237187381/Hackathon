# WorthIt?

WorthIt? is a human-led product review and anti-overconsumption MVP. It keeps two questions separate:

1. **Is this product good?** The community rating is calculated only from reviews submitted to WorthIt?.
2. **Do I need to buy it?** The personal purchase score considers the signed-in user's existing products and explains every adjustment.

The interface is intentionally discussion-led rather than store-like. It does not sell products, create fake verified-purchase badges, scrape reviews, or treat generated text as a human experience.

> **Demonstration data:** all bundled products, people, activity counts, ownership records, reviews, and comments are fictional development fixtures. The UI labels this content as demo data. It must not be deployed or represented as real community activity.

## Quick start

Requirements:

- Node.js 18 or newer
- npm 9 or newer

Run the local API in one terminal:

```bash
cd backend
npm ci
npm start
```

Run the frontend in another terminal:

```bash
cd frontend
npm ci
npm start
```

Open [http://localhost:3000](http://localhost:3000). The API listens on [http://localhost:3001](http://localhost:3001) by default.

The development API stores data in a local JSON file. It does not require Supabase or an SMS account. Do not use this storage or authentication mode for production data.

## Local demo authentication

Existing users sign in with a username or email and password. A bundled demonstration account is available:

- Username: **`maya`**
- Email: **`demo@worthit.local`**
- Password: **`worthit123`**

Creating an account requires an email, unique username, password and phone number. After the details step, enter development OTP **`123456`** to verify the phone and finish registration.

No SMS is sent locally. Backend registration challenges expire, enforce a resend cooldown and limit attempts. Passwords are salted and hashed server-side. The fixed OTP is accepted only outside production; production fails closed until a real SMS provider is configured.

Use a fictional/test number during development; do not enter another person's phone number.

## Commands

Run these from `frontend/`:

| Command | Purpose |
| --- | --- |
| `npm start` | Start the CRA development server on port 3000. |
| `npm test -- --watchAll=false` | Run the Jest/React Testing Library suite once. |
| `npm test -- --watchAll=false src/utils/purchaseScoring.test.js` | Run the deterministic score and lifespan tests. |
| `npm run build` | Create an optimised production bundle in `build/`; CRA also runs its configured ESLint checks. |

The project is JavaScript and currently has no standalone type-check command.

Run these from `backend/`:

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Express API on port 3001. |
| `npm test` | Run backend tests when present. |

## Architecture

The repository preserves the existing Create React App and Express structure:

```text
Hackathon/
├── frontend/
│   ├── public/assets/             # WorthIt? presentation assets
│   └── src/
│       ├── App.js                 # App shell, navigation and client flows
│       ├── App.css                # Design tokens and responsive layouts
│       ├── components/            # Reusable UI such as icons and ratings
│       ├── data/demoData.js       # Explicitly fictional development fixtures
│       └── utils/
│           ├── purchaseScoring.js # Pure score/lifespan utilities
│           └── purchaseScoring.test.js
└── backend/
    ├── server.js                  # Public catalogue and protected ownership API
    ├── auth.js                    # Development OTP/session boundary
    └── db.js                      # Local JSON persistence adapter
```

Public catalogue endpoints support health checks, categories, catalogue/search, and product details. Protected endpoints support the local ownership dashboard and personal purchase-score calculation. Product and review fixtures are internal to WorthIt? and are never imported from external review sites.

The frontend treats community ratings and personal guidance as distinct components and data values. Pure calculation code is kept outside the UI so threshold behavior and explanations can be tested directly.

## Personal purchase score

The score is deterministic and explainable. It is not an AI verdict and is not financial advice.

The current formula is:

1. Start at `55`.
2. Add `(community rating - 3) × 12`.
3. Add `8` with at least 10 community reviews.
4. Add another `5` with at least 50 community reviews.
5. Subtract `15` with fewer than three reviews.
6. For the closest relevant owned product in the same category:
   - subtract `45` if it is active with more than 50% of its expected lifespan remaining;
   - subtract `25` if it is active with 20–50% remaining;
   - subtract `10` if it is active with less than 20% remaining;
   - add `10` if it has exceeded its expected lifespan;
   - add `10` if it is damaged;
   - add `5` if it is disposed or replaced.
7. Clamp the result to `0–100`.

Recommendation labels are:

- `75–100`: **Reasonable purchase**
- `50–74`: **Consider carefully**
- `0–49`: **Probably skip**

Every result includes positive and negative factors, the relevant owned item, data limitations, and a guidance-not-financial-advice disclaimer. A score is never intended to replace the separate community average.

Community confidence also remains separate from the average:

- fewer than 3 reviews: **Insufficient community data**
- 3–9 reviews: **Early community rating**
- 10–49 reviews: **Developing community rating**
- 50 or more reviews: **Established community rating**

Lifespan calculations use UTC calendar months. A user-adjusted lifespan takes precedence over the general product lifespan.

## Privacy and trust boundary

In the local MVP:

- public catalogue and human-review reading do not require login;
- ownership records and purchase scores require the local authenticated session;
- phone numbers are normalised for authentication and shown back only in masked form;
- the UI never publishes a phone number;
- demo ownership records are fictional;
- local JSON files and browser state are development conveniences, not a production security boundary.

For production, privacy must be enforced in the database and trusted server actions—not only by hiding controls in React. At minimum:

- users may read and update only their own profile-private and ownership rows;
- users may edit only their own reviews and comments;
- helpful votes must be unique and self-voting must be rejected;
- moderator actions must require a moderator role and create an audit record;
- suspended accounts must be blocked from protected mutations;
- phone numbers and provider credentials must never appear in public tables or responses.

Never expose a Supabase service-role key, database connection string, or SMS provider secret through a `REACT_APP_*` variable. CRA embeds those values in the browser bundle. Only the Supabase URL and anonymous client key belong in the frontend, backed by complete RLS policies.

## Production services and configuration

The local demo does **not** provide production-ready authentication or persistence. A production deployment requires:

1. **Supabase Auth** with email/password accounts, phone verification during registration, session persistence, allowed redirect URLs, and abuse/rate-limit settings.
2. **An SMS provider** supported by Supabase, configured in the Supabase dashboard with a real sender and delivery credentials.
3. **Supabase Postgres** migrations for profiles, products, ownership, reviews, votes, comments, saves, product validation, content reports, and moderation history.
4. **Row Level Security** enabled on every user or moderation-sensitive table, with policies tested for anonymous, member, suspended, and moderator roles.
5. **Server-side actions or database functions** for score inputs, duplicate constraints, one-review-per-user enforcement, self-vote prevention, moderation, and any operation requiring elevated authority.
6. Separate development, staging, and production projects with production seed/demo content disabled.

The root `.env.example` lists the expected public and server-only configuration boundaries. It is a template: the current CRA/Express demo does not yet consume every production variable.

### Suggested production authentication flow

1. Validate the submitted email, username, password and E.164 phone number.
2. Reserve the unique email/username and request an SMS OTP.
3. Verify the phone, then create the password account and profile transactionally.
4. Let returning users sign in with username or email plus password.
5. Restore the exact page or protected action that initiated authentication and verify authorization again on every server-side mutation.

## Implemented MVP surface

- Responsive feed-first homepage, simplified catalogue and focused Community page.
- Public product discovery with search, categories, filters, and product detail views.
- Community rating, review count, rating distribution, confidence labels, current-owner context, and long-term-owner context.
- Human-experience review cards with the reviewer's relationship to the product displayed prominently.
- Separate, explainable personal purchase score using ownership and lifespan data.
- Lifespan progress and ownership-dashboard summaries.
- Username/email and password sign-in, plus phone-verified account creation with masked-number, cooldown, loading and error states.
- Internal demo catalogue, reviews, discussions, ownership records, recommendations, and long-lasting alternatives.
- Pure score/lifespan utilities with focused unit tests.
- Public catalogue and private ownership API boundaries for local evaluation.

Where an interaction is presented as a demo, it is labelled and uses local fixture/state data. It is not evidence of a production database mutation or real community activity.

## Intentionally deferred

- Live Supabase phone authentication and SMS delivery.
- Postgres migrations and production RLS policies.
- Production image upload/storage and image moderation.
- Durable user-created reviews, threaded comments, helpful votes, saves, reports, and moderation audit history.
- Full duplicate-product merge workflow and database similarity search.
- Transactional product validation/edit history.
- Production rate limiting, abuse detection, observability, backups, and recovery.
- Complete end-to-end permission tests against deployed Supabase policies.
- Server-rendered metadata/SEO and share previews.

These are deferred production capabilities, not simulated claims. External review scraping, copied reviews, AI-generated experiences, fake verified-purchase labels, paid ranking, and checkout are deliberately excluded from the product altogether.

## Known limitations

- Catalogue/review/activity content is fictional demo data and is unsuitable for production.
- Local persistence is a single-process JSON adapter without database transactions, RLS, or multi-instance safety.
- The fixed development OTP is not real identity verification and must never be enabled in production.
- Some client-side demo actions may reset when local state or storage is cleared.
- Official product links in fixtures use placeholder domains.
- Community activity and trending values are fixture-driven in development rather than calculated from production events.
- The frontend uses Create React App and client-side rendering; deep-link hosting rules may require an SPA fallback.
- Production authorization, uniqueness, and ownership rules remain dependent on the Supabase schema and policies described above.

## Data provenance rule

Only reviews submitted by authenticated WorthIt? users may contribute to a real community rating. Do not connect the removed prototype scraping behavior, external review feeds, retailer ratings, generated sentiment scores, or invented activity to the production product. Development fixtures must stay visibly labelled and must be absent from production datasets.
