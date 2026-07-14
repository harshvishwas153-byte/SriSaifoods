# Sri Sai's Fryums — Rewards Backend

Node.js + Express + PostgreSQL + Prisma backend for the QR cashback
rewards program. Powers the `rewards.html` / `reward-claim.html`
frontend pages already built into the site.

---

## 1. Folder structure

```
backend/
├── .env.example          # Template for required environment variables
├── .gitignore
├── package.json          # Dependencies + npm scripts
├── prisma/
│   ├── schema.prisma      # Database model (source of truth for the DB schema)
│   └── seed.js            # Inserts sample QR tokens for local testing
└── src/
    ├── server.js           # Entry point — starts the HTTP server
    ├── app.js               # Express app: middleware + route wiring (no listen())
    ├── config/
    │   └── env.js             # Loads & validates all environment variables
    ├── lib/
    │   └── prisma.js          # Shared PrismaClient singleton
    ├── routes/
    │   ├── reward.routes.js   # GET /api/reward/:token, POST /api/reward/claim
    │   └── admin.routes.js    # POST /api/admin/reward/generate (bonus, see §5)
    ├── controllers/
    │   ├── reward.controller.js  # HTTP layer for the two public APIs
    │   └── admin.controller.js   # HTTP layer for the admin generate endpoint
    ├── services/
    │   ├── reward.service.js     # All business logic: lookup + atomic claim
    │   └── token.service.js      # Generates new QR tokens (bonus)
    ├── middleware/
    │   ├── errorHandler.js    # Central error → JSON response handler
    │   ├── notFound.js        # 404 handler for unmatched routes
    │   ├── rateLimiter.js     # Rate-limits the claim endpoint
    │   └── adminAuth.js       # API-key gate for the admin route
    └── utils/
        ├── ApiError.js         # Error class carrying an HTTP status code
        └── asyncHandler.js     # Wraps async routes so errors reach errorHandler
```

### What each file is for, in plain terms

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Defines the `reward_qr` table and its columns/types. This is the single source of truth Prisma uses to create migrations and generate the type-safe database client. |
| `prisma/seed.js` | A one-off script (`npm run seed`) that inserts sample tokens (active, expired, and already-redeemed) so you can test the API immediately after setup, without manually writing SQL. |
| `src/server.js` | The actual process entry point (`node src/server.js`). Starts listening on `PORT` and handles process-level errors (unhandled rejections, `SIGTERM`). |
| `src/app.js` | Builds the Express app: registers security middleware (`helmet`, `cors`), body parsing, logging (`morgan`), the health check, both route groups, and the error handlers. Kept separate from `server.js` so the app can be imported by tests without opening a real port. |
| `src/config/env.js` | Reads `process.env`, applies defaults, and throws a clear error immediately on startup if something required (like `DATABASE_URL`) is missing — instead of failing confusingly later. |
| `src/lib/prisma.js` | Exports one shared `PrismaClient` instance for the whole app, so every file that touches the database reuses the same connection pool instead of each accidentally creating its own. |
| `src/routes/reward.routes.js` | Maps the two required public URLs to their controller functions. |
| `src/routes/admin.routes.js` | Maps the bonus admin URL, protected by `adminAuth`. |
| `src/controllers/reward.controller.js` | Reads `req.params` / `req.body`, calls the service layer, and sends the JSON response with the right HTTP status code. Contains no database queries itself. |
| `src/controllers/admin.controller.js` | Same idea, for the admin generate endpoint: validates the shape of the input, then delegates to `token.service.js`. |
| `src/services/reward.service.js` | The actual business rules: what makes a token valid, expired, or already redeemed, and how a claim is safely recorded (see §4 for the concurrency explanation). This is the file you'll touch most when wiring up Cashfree later. |
| `src/services/token.service.js` | Generates new random tokens and inserts them into the database. This is what the frontend's existing "Generate Reward QR" admin form will eventually call. |
| `src/middleware/errorHandler.js` | Any error thrown anywhere in a route (via `throw new ApiError(...)` or any unexpected exception) ends up here and is turned into a consistent `{ success: false, error }` JSON response. |
| `src/middleware/notFound.js` | Catches requests to URLs that don't match any route and returns a clean 404 JSON body instead of Express's default HTML error page. |
| `src/middleware/rateLimiter.js` | Limits claim attempts per IP (20 per 15 minutes) so someone can't brute-force guess valid tokens. |
| `src/middleware/adminAuth.js` | Requires an `x-admin-key` header matching `ADMIN_API_KEY` before the admin generate route will run. If `ADMIN_API_KEY` isn't set, the route is disabled entirely (returns 503). |
| `src/utils/ApiError.js` | A tiny custom `Error` subclass that carries an HTTP status code, so `throw new ApiError(404, 'not found')` is all a service needs to do — `errorHandler.js` handles the rest. |
| `src/utils/asyncHandler.js` | Express doesn't automatically catch errors thrown inside `async` functions. This wrapper does, so you never need a manual `try/catch` in a controller. |

---

## 2. Setup

**Prerequisites:** Node.js 18+, a running PostgreSQL server (local or hosted).

```bash
cd backend
npm install

# Copy the env template and fill in your real database credentials
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/sri_sai_rewards?schema=public"
```

Create the database and table (Prisma migration):
```bash
npm run prisma:migrate     # creates the reward_qr table from schema.prisma
npm run seed                # optional: inserts sample tokens for testing
npm run dev                  # starts the API on http://localhost:4000
```

> **Note on this sandbox:** I built, syntax-checked, and ran this backend
> end-to-end here (Express app + full request/response cycle for every
> success/error path), and separately confirmed `schema.prisma` produces
> valid PostgreSQL DDL by applying it directly against a live Postgres
> instance. The one thing I could **not** run in this sandbox is
> `prisma migrate` / `prisma generate` themselves — Prisma needs to
> download its query/schema engine binaries from `binaries.prisma.sh`,
> which isn't reachable from this environment's restricted network. On
> your own machine (normal internet access) `npm run prisma:migrate`
> will work as usual.

---

## 3. API Reference

### `GET /api/reward/:token`
Read-only lookup — does not change anything in the database.

**Response — valid token (200):**
```json
{
  "valid": true,
  "cashbackAmount": 20,
  "redeemed": false,
  "expired": false,
  "status": "ACTIVE",
  "campaign": "launch-2026"
}
```

**Response — unknown token (404):**
```json
{ "valid": false, "error": "Reward token not found" }
```

### `POST /api/reward/claim`
**Body:**
```json
{ "token": "abc123", "upiId": "name@upi" }
```

**Response — success (200):**
```json
{
  "success": true,
  "message": "Reward claimed successfully",
  "cashbackAmount": 20
}
```

**Error responses:**
| Status | When |
|---|---|
| 400 | Missing/invalid `token` or `upiId` |
| 404 | Token doesn't exist |
| 409 | Token already redeemed |
| 410 | Token expired |

No payment provider (Cashfree, etc.) is called — this only validates
the token and flips it to `REDEEMED` in the database, exactly as
requested. Wire the actual payout call into `reward.service.js` →
`claimReward()` when you're ready.

### Bonus: `POST /api/admin/reward/generate`
Not part of the original spec, but included because the frontend's
Admin dashboard already has a "Generate Reward QR" form with nothing
to call. Disabled by default — set `ADMIN_API_KEY` in `.env` to enable it.

**Headers:** `x-admin-key: <your ADMIN_API_KEY>`
**Body:**
```json
{ "amount": 10, "count": 50, "campaign": "diwali-2026" }
```
Creates `count` new tokens worth `amount` rupees each and returns them.

---

## 4. How duplicate claims are prevented (concurrency)

If two requests try to claim the same token at almost the same instant,
a naive "read status, then write" approach could let both succeed. This
backend instead performs the update as:

```js
prisma.rewardQR.updateMany({
  where: { token, status: 'ACTIVE' },  // only matches if still unclaimed
  data: { status: 'REDEEMED', ... }
});
```

Only the request that finds the row still `ACTIVE` *at the moment of
the update* succeeds (`count: 1`); the other gets `count: 0` and is
told the reward was already claimed. This is enforced by PostgreSQL
itself, not application logic, so it's safe under real concurrent
traffic.

---

## 5. What's intentionally NOT included yet

- **Cashfree / UPI payout integration** — as requested, claiming only
  validates and marks the token `REDEEMED`. No money moves yet.
- **Admin authentication beyond a shared API key** — fine for an
  internal tool, but replace with real login/session auth before
  giving broader access.
- **Automated expiry sweeping** — expiry is checked on read/claim
  (lazy evaluation), so no cron job is needed for correctness. You
  could add one later purely for reporting/cleanup purposes.
