# Sri Sai's Fryums - Complete Reward Claim System

## System Architecture

The reward claim system uses **MVC Architecture** with:
- **Models**: Prisma ORM with PostgreSQL
- **Controllers**: HTTP request handlers with business logic delegation
- **Services**: Core business logic and database operations
- **Routes**: API endpoint definitions with middleware

---

## Database Schema

### reward_qr Table

```sql
CREATE TABLE reward_qr (
  id                 SERIAL PRIMARY KEY,
  token              VARCHAR(64) UNIQUE NOT NULL,
  cashback_amount    INTEGER NOT NULL,
  status             VARCHAR(20) DEFAULT 'ACTIVE',
  campaign           VARCHAR(120),
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  redeemed_at        TIMESTAMP,
  redeemed_upi_id    VARCHAR(120),
  expires_at         TIMESTAMP
);

CREATE INDEX idx_reward_qr_status ON reward_qr(status);
```

### Prisma Schema

File: `backend/prisma/schema.prisma`

```prisma
enum RewardStatus {
  ACTIVE   // QR generated, not yet claimed, not expired
  REDEEMED // QR successfully claimed by a customer
  EXPIRED  // QR passed its expiry date without being claimed
}

model RewardQR {
  id             Int          @id @default(autoincrement())
  token          String       @unique @db.VarChar(64)
  cashbackAmount Int          @map("cashback_amount")
  status         RewardStatus @default(ACTIVE)
  campaign       String?      @db.VarChar(120)
  createdAt      DateTime     @default(now()) @map("created_at")
  redeemedAt     DateTime?    @map("redeemed_at")
  redeemedUpiId  String?      @map("redeemed_upi_id") @db.VarChar(120)
  expiresAt      DateTime?    @map("expires_at")

  @@index([status])
  @@map("reward_qr")
}
```

---

## API Endpoints

### 1. Generate Reward QR (Admin)

**Endpoint**: `POST /api/admin/rewards/generate`

**Authentication**: Required - `Authorization: Bearer <sessionToken>` header

**Request**:
```json
{
  "count": 1000,
  "campaign": "Sri Sai Launch",
  "rewards": [5, 10, 20, 50, 100]
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "count": 1000,
  "campaign": "Sri Sai Launch",
  "rewards": [5, 10, 20, 50, 100],
  "generated": [
    {
      "id": 1,
      "token": "a1b2c3d4e5f6g7h8i9j0k1l2",
      "cashbackAmount": 20,
      "status": "ACTIVE",
      "campaign": "Sri Sai Launch",
      "createdAt": "2026-07-14T10:30:00.000Z",
      "redeemedAt": null,
      "redeemedUpiId": null,
      "expiresAt": "2026-10-12T10:30:00.000Z"
    },
    ...
  ]
}
```

---

### 2. Verify Reward

**Endpoint**: `GET /api/reward/:token`

**Authentication**: None

**Request Parameters**:
- `token` (URL param): Reward token from QR code

**Response (200 OK) - Valid Reward**:
```json
{
  "valid": true,
  "cashbackAmount": 50,
  "redeemed": false,
  "expired": false,
  "status": "ACTIVE",
  "campaign": "Sri Sai Launch"
}
```

**Response (200 OK) - Already Redeemed**:
```json
{
  "valid": true,
  "cashbackAmount": 50,
  "redeemed": true,
  "expired": false,
  "status": "REDEEMED",
  "campaign": "Sri Sai Launch"
}
```

**Response (200 OK) - Expired**:
```json
{
  "valid": true,
  "cashbackAmount": 50,
  "redeemed": false,
  "expired": true,
  "status": "EXPIRED",
  "campaign": "Sri Sai Launch"
}
```

**Response (404 Not Found)**:
```json
{
  "valid": false,
  "error": "Reward token not found"
}
```

---

### 3. Claim Reward

**Endpoint**: `POST /api/reward/claim`

**Authentication**: None

**Request**:
```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2",
  "upiId": "harsh@ybl"
}
```

**Response (200 OK) - Success**:
```json
{
  "success": true,
  "message": "Reward claimed successfully",
  "cashbackAmount": 50
}
```

**Response (400 Bad Request)**:
```json
{
  "success": false,
  "error": "A valid UPI ID is required (e.g. name@upi)"
}
```

**Response (404 Not Found)**:
```json
{
  "success": false,
  "error": "Invalid reward token"
}
```

**Response (409 Conflict) - Already Claimed**:
```json
{
  "success": false,
  "error": "This reward has already been claimed"
}
```

**Response (410 Gone) - Expired**:
```json
{
  "success": false,
  "error": "This reward has expired"
}
```

---

## File Structure

### Backend Files

#### 1. `src/routes/reward.routes.js`
Defines public reward endpoints.

```javascript
const express = require("express");
const rewardController = require("../controllers/reward.controller");
const claimRateLimiter = require("../middleware/rateLimiter");

const router = express.Router();

// GET /api/reward/:token
router.get("/:token", rewardController.getReward);

// POST /api/reward/claim
router.post("/claim", claimRateLimiter, rewardController.claimReward);

module.exports = router;
```

---

#### 2. `src/controllers/reward.controller.js`
Handles HTTP requests and responses.

```javascript
const asyncHandler = require("../utils/asyncHandler");
const rewardService = require("../services/reward.service");

// GET /api/reward/:token
exports.getReward = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const result = await rewardService.getRewardStatus(token);

  const statusCode = result.valid ? 200 : 404;
  res.status(statusCode).json(result);
});

// POST /api/reward/claim
exports.claimReward = asyncHandler(async (req, res) => {
  const { token, upiId } = req.body || {};
  const result = await rewardService.claimReward(token, upiId);
  res.status(200).json(result);
});
```

---

#### 3. `src/services/reward.service.js`
Core business logic for reward operations.

```javascript
const prisma = require("../lib/prisma");
const ApiError = require("../utils/ApiError");

const UPI_REGEX = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;

function isPastExpiry(reward) {
  return Boolean(reward.expiresAt && new Date() > reward.expiresAt);
}

/**
 * Verify reward status without modifying database
 */
async function getRewardStatus(token) {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "A token is required" };
  }

  const reward = await prisma.rewardQR.findUnique({ where: { token } });

  if (!reward) {
    return { valid: false, error: "Reward token not found" };
  }

  const expired = reward.status === "EXPIRED" || isPastExpiry(reward);

  return {
    valid: true,
    cashbackAmount: reward.cashbackAmount,
    redeemed: reward.status === "REDEEMED",
    expired,
    status: expired ? "EXPIRED" : reward.status,
    campaign: reward.campaign,
  };
}

/**
 * Claim reward with atomic database operation
 * Prevents race conditions: only one claim per token succeeds
 */
async function claimReward(token, upiId) {
  if (!token || typeof token !== "string") {
    throw new ApiError(400, "A valid token is required");
  }
  if (!upiId || typeof upiId !== "string" || !UPI_REGEX.test(upiId.trim())) {
    throw new ApiError(400, "A valid UPI ID is required (e.g. name@upi)");
  }

  const reward = await prisma.rewardQR.findUnique({ where: { token } });

  if (!reward) {
    throw new ApiError(404, "Invalid reward token");
  }
  if (reward.status === "EXPIRED" || isPastExpiry(reward)) {
    throw new ApiError(410, "This reward has expired");
  }
  if (reward.status === "REDEEMED") {
    throw new ApiError(409, "This reward has already been claimed");
  }

  // Atomic update: only succeeds if status is still ACTIVE
  const result = await prisma.rewardQR.updateMany({
    where: { token, status: "ACTIVE" },
    data: {
      status: "REDEEMED",
      redeemedAt: new Date(),
      redeemedUpiId: upiId.trim(),
    },
  });

  if (result.count === 0) {
    throw new ApiError(409, "This reward has already been claimed");
  }

  return {
    success: true,
    message: "Reward claimed successfully",
    cashbackAmount: reward.cashbackAmount,
  };
}

module.exports = { getRewardStatus, claimReward };
```

---

### Frontend Files

#### 1. `reward-claim.html`
Complete reward claim page with backend integration.

**Features**:
- Reads token from URL query parameter: `reward-claim.html?token=abc123`
- Calls `GET /api/reward/:token` to verify reward
- Displays reward amount, campaign, and expiry
- Shows UPI input field
- Calls `POST /api/reward/claim` when user submits
- Handles loading, success, and error states
- Shows proper error messages for:
  - Reward not found
  - Already claimed
  - Expired reward
  - Invalid UPI format

---

## Testing with Postman

### Setup

1. Import the endpoints below into Postman
2. Set variable: `base_url` = `https://srisaifoods.onrender.com`
3. Set variable: `session_token` = the token returned by `/api/auth/verify-otp`

### Test Sequence

#### Step 1: Generate Rewards

**Request**:
```
POST {{base_url}}/api/admin/rewards/generate
Header: Authorization: Bearer {{session_token}}
Body:
{
  "count": 5,
  "campaign": "Test Campaign",
  "rewards": [5, 10, 20, 50, 100]
}
```

**Expected Response** (201):
```json
{
  "success": true,
  "count": 5,
  "campaign": "Test Campaign",
  "rewards": [5, 10, 20, 50, 100],
  "generated": [
    {
      "id": 1,
      "token": "a1b2c3d4e5f6g7h8i9j0k1l2",
      "cashbackAmount": 20,
      "status": "ACTIVE",
      "campaign": "Test Campaign",
      "createdAt": "2026-07-14T12:00:00.000Z",
      "expiresAt": "2026-10-12T12:00:00.000Z"
    },
    ...
  ]
}
```

**Copy the first token from response** → Save as `{{test_token}}`

---

#### Step 2: Verify Reward (Before Claim)

**Request**:
```
GET {{base_url}}/api/reward/{{test_token}}
```

**Expected Response** (200):
```json
{
  "valid": true,
  "cashbackAmount": 20,
  "redeemed": false,
  "expired": false,
  "status": "ACTIVE",
  "campaign": "Test Campaign"
}
```

---

#### Step 3: Claim Reward

**Request**:
```
POST {{base_url}}/api/reward/claim
Content-Type: application/json

{
  "token": "{{test_token}}",
  "upiId": "test@ybl"
}
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Reward claimed successfully",
  "cashbackAmount": 20
}
```

---

#### Step 4: Verify Reward (After Claim)

**Request**:
```
GET {{base_url}}/api/reward/{{test_token}}
```

**Expected Response** (200):
```json
{
  "valid": true,
  "cashbackAmount": 20,
  "redeemed": true,
  "expired": false,
  "status": "REDEEMED",
  "campaign": "Test Campaign"
}
```

---

#### Step 5: Attempt Duplicate Claim

**Request**:
```
POST {{base_url}}/api/reward/claim
Content-Type: application/json

{
  "token": "{{test_token}}",
  "upiId": "another@upi"
}
```

**Expected Response** (409):
```json
{
  "success": false,
  "error": "This reward has already been claimed"
}
```

---

#### Step 6: Test Invalid UPI

**Request**:
```
POST {{base_url}}/api/reward/claim
Content-Type: application/json

{
  "token": "{{test_token}}",
  "upiId": "invalid-upi-format"
}
```

**Expected Response** (400):
```json
{
  "success": false,
  "error": "A valid UPI ID is required (e.g. name@upi)"
}
```

---

#### Step 7: Test Non-existent Token

**Request**:
```
GET {{base_url}}/api/reward/nonexistent123
```

**Expected Response** (404):
```json
{
  "valid": false,
  "error": "Reward token not found"
}
```

---

## Frontend Integration

### QR Code Generation

QR codes in the admin dashboard now contain:
```
reward-claim.html?token=<actual_backend_token>
```

When a customer scans the QR code, the browser opens `reward-claim.html?token=abc123` which:

1. **Extracts token from URL** → `abc123`
2. **Verifies reward** → `GET /api/reward/abc123`
3. **Displays reward details**
4. **Asks for UPI ID**
5. **Claims reward** → `POST /api/reward/claim`
6. **Shows success/error state**

---

## Key Implementation Details

### Race Condition Prevention

The claim endpoint uses atomic database operations:

```javascript
const result = await prisma.rewardQR.updateMany({
  where: { token, status: "ACTIVE" },
  data: {
    status: "REDEEMED",
    redeemedAt: new Date(),
    redeemedUpiId: upiId.trim(),
  },
});

if (result.count === 0) {
  // Someone else claimed it in the split-second between verification and update
  throw new ApiError(409, "This reward has already been claimed");
}
```

This ensures:
- Even with concurrent requests, only ONE claim succeeds
- Database integrity is maintained at the transaction level
- No separate read-then-write race window

### UPI Validation

```javascript
const UPI_REGEX = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;
```

Accepts formats:
- ✅ `name@upi`
- ✅ `harsh@ybl`
- ✅ `user.name@okaxis`
- ❌ `invalid-upi` (no @)
- ❌ `user@123` (numeric bank code)

### Error Handling

| Scenario | Status | Code | Message |
|----------|--------|------|---------|
| Missing token | 400 | Bad Request | "A valid token is required" |
| Invalid UPI | 400 | Bad Request | "A valid UPI ID is required" |
| Token not found | 404 | Not Found | "Invalid reward token" |
| Already claimed | 409 | Conflict | "This reward has already been claimed" |
| Expired reward | 410 | Gone | "This reward has expired" |
| Success | 200 | OK | "Reward claimed successfully" |

---

## Deployment Checklist

- ✅ Prisma schema defined
- ✅ Database migrations applied
- ✅ Backend APIs implemented
- ✅ Frontend integration complete
- ✅ Error handling implemented
- ✅ Race condition prevention
- ✅ UPI validation
- ✅ Rate limiting on claim endpoint
- ✅ CORS configured
- ✅ Admin authentication required for generation
- ✅ Existing QR generation APIs unchanged

---

## Environment Configuration

### Backend `.env`

```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/sri_sai_rewards?schema=public"
REWARD_EXPIRY_DAYS=90
ADMIN_SESSION_SECRET=replace-with-a-long-random-secret
CORS_ORIGIN=*
```

### Frontend Configuration

In `index.html` and `reward-claim.html`:
```javascript
const API_BASE_URL = 'https://srisaifoods.onrender.com';
```
```

---

## Code Quality Standards

✅ **MVC Architecture**: Controllers, Services, Routes separated  
✅ **Async/Await**: No callback hell  
✅ **Error Handling**: Try-catch with meaningful messages  
✅ **Input Validation**: Token and UPI format checks  
✅ **Database Integrity**: Atomic operations, indexes  
✅ **Security**: Admin auth, UPI regex, rate limiting  
✅ **Type Safety**: Prisma generates TypeScript types  
✅ **Logging**: Morgan HTTP logging  

---

## Support & Debugging

### Check Backend Status
```bash
curl https://srisaifoods.onrender.com/health
```

### View Prisma Admin UI
```bash
cd backend
npx prisma studio
```

### Check Database Records
```bash
psql postgresql://user:password@localhost:5432/sri_sai_rewards
SELECT * FROM reward_qr ORDER BY created_at DESC LIMIT 10;
```

### View Backend Logs
Backend server logs are printed to console with Morgan middleware.

---

**System Status**: ✅ **Production Ready**
