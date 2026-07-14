# Cashfree Configuration Guide - Step by Step

## 🎯 Goal

Get Cashfree payout API credentials and configure them in your backend.

---

## 📋 Prerequisites

- [ ] Cashfree account (free signup)
- [ ] Bank account details for receiving payouts
- [ ] Access to backend .env file

---

## 🔑 Getting Credentials

### Step 1: Create Cashfree Account

1. Go to **https://www.cashfree.com**
2. Click **Sign Up** (or **Get Started**)
3. Choose **Business Account** → **Payout API** OR **Payments + Payouts**
4. Fill in:
   - Business name: **Sri Sai Foods**
   - Email: Your business email
   - Phone: Your contact number
   - Website: https://srisaifoods.onrender.com

### Step 2: Complete Business Verification

1. Provide:
   - [ ] Business registration document (optional for sandbox)
   - [ ] Beneficiary bank account details
   - [ ] PAN number (for India)
   - [ ] Business address proof

2. Cashfree will verify (takes 24-48 hours)

### Step 3: Access Payout API Dashboard

1. Log in to **https://merchant.cashfree.com**
2. Go to **Settings** → **API Keys** (or **Developers** → **API Keys**)
3. You'll see two sections:
   - **Collections API** (for collecting payments)
   - **Payouts API** (for sending payouts) ← We need this

### Step 4: Copy Payout API Credentials

Under **Payouts API**, you'll find:

```
TEST Environment:
├─ Client ID: cf_payout_test_123456789...
├─ Client Secret: cfsk_test_abc123def456...
└─ App ID: cf_app_test_xyz789...

PROD Environment:
├─ Client ID: cf_payout_live_123456789...
├─ Client Secret: cfsk_live_abc123def456...
└─ App ID: cf_app_live_xyz789...
```

**Copy these four values**:
- `CASHFREE_PAYOUT_CLIENT_ID` (from Client ID)
- `CASHFREE_PAYOUT_CLIENT_SECRET` (from Client Secret)
- `CASHFREE_APP_ID` (from App ID)
- `CASHFREE_CLIENT_SECRET` (same as Client Secret)

---

## 🔧 Configure Backend

### Step 1: Update .env File

Open `backend/.env` and fill in the values:

```bash
# CASHFREE PAYOUT CONFIGURATION
CASHFREE_ENV=TEST                    # Start with TEST
CASHFREE_APP_ID=cf_app_test_...      # From dashboard
CASHFREE_CLIENT_SECRET=cfsk_test_... # From dashboard
CASHFREE_PAYOUT_CLIENT_ID=cf_payout_test_... # From dashboard
CASHFREE_PAYOUT_CLIENT_SECRET=cfsk_test_... # From dashboard
```

### Step 2: Restart Backend

```bash
cd backend
npm start
```

You should see:
```
[Cashfree] Successfully authenticated (TEST mode)
Sri Sai Rewards API listening on port 4000
```

### Step 3: Test with TEST Credentials

```bash
# Generate a test reward
curl -X POST https://srisaifoods.onrender.com/api/admin/rewards/generate \
  -H "x-admin-key: f8171c016dea72712d4f704a07d2aabb780bfa32e0c28409" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 1,
    "campaign": "Cashfree Test",
    "rewards": [10]
  }'

# Response will include a token, e.g., "token": "abc123def456..."

# Claim the reward
curl -X POST https://srisaifoods.onrender.com/api/reward/claim \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123def456...",
    "upiId": "test@ybl"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Reward claimed successfully and payout initiated",
  "cashbackAmount": 10,
  "payoutStatus": "INITIATED",
  "transferId": "cf_reward_..."
}
```

**In Cashfree Dashboard**:
Go to **Transactions** and you should see the test payout.

---

## ✅ Checklist for PROD

Once everything works in TEST:

### 1. Get PROD Credentials
```bash
# Copy the PROD values from Cashfree dashboard (not TEST)
CASHFREE_APP_ID=cf_app_live_123456789
CASHFREE_CLIENT_SECRET=cfsk_live_abc123def456
CASHFREE_PAYOUT_CLIENT_ID=cf_payout_live_123456789
CASHFREE_PAYOUT_CLIENT_SECRET=cfsk_live_abc123def456
```

### 2. Update .env
```bash
CASHFREE_ENV=PROD     # Change from TEST to PROD
CASHFREE_APP_ID=cf_app_live_...
CASHFREE_CLIENT_SECRET=cfsk_live_...
CASHFREE_PAYOUT_CLIENT_ID=cf_payout_live_...
CASHFREE_PAYOUT_CLIENT_SECRET=cfsk_live_...
```

### 3. Deploy
```bash
git commit -am "Update Cashfree to PROD"
git push origin main
# Render auto-deploys
```

### 4. Update Render Environment Variables
Go to **Render Dashboard** → Your Project → **Environment**:

```
CASHFREE_ENV=PROD
CASHFREE_APP_ID=cf_app_live_...
CASHFREE_CLIENT_SECRET=cfsk_live_...
CASHFREE_PAYOUT_CLIENT_ID=cf_payout_live_...
CASHFREE_PAYOUT_CLIENT_SECRET=cfsk_live_...
```

### 5. Restart Service
```
Render Dashboard → Restart → Manual Restart
```

### 6. Verify in Logs
```
Check deploy logs for:
[Cashfree] Successfully authenticated (PROD mode)
```

---

## 🧪 Testing Different Scenarios

### Test 1: Small Payout (₹5)
```bash
curl -X POST https://srisaifoods.onrender.com/api/admin/rewards/generate \
  -H "x-admin-key: f8171c016dea72712d4f704a07d2aabb780bfa32e0c28409" \
  -H "Content-Type: application/json" \
  -d '{"count": 1, "campaign": "Small Test", "rewards": [5]}'
```

Expected: Payout initiates for ₹5

### Test 2: Large Payout (₹100)
```bash
curl -X POST https://srisaifoods.onrender.com/api/admin/rewards/generate \
  -H "x-admin-key: f8171c016dea72712d4f704a07d2aabb780bfa32e0c28409" \
  -H "Content-Type: application/json" \
  -d '{"count": 1, "campaign": "Large Test", "rewards": [100]}'
```

Expected: Payout initiates for ₹100

### Test 3: Invalid UPI
```bash
curl -X POST https://srisaifoods.onrender.com/api/reward/claim \
  -H "Content-Type: application/json" \
  -d '{"token": "abc123...", "upiId": "invalid-upi"}'
```

Expected: 400 error - Invalid UPI (Cashfree NOT called)

### Test 4: Different UPI Providers
```bash
# Google Pay
{"upiId": "harsh@okaxis"}

# ICICI Bank
{"upiId": "harsh@icici"}

# HDFC Bank  
{"upiId": "harsh@hdfc"}

# Axis Bank
{"upiId": "harsh@axisbank"}

# Phone Pe
{"upiId": "harsh@ybl"}
```

---

## 🔍 Monitoring Payouts

### In Cashfree Dashboard

1. Go to **Transactions**
2. Filter by **Type** = **Payout**
3. You'll see:
   - Transfer ID (from your system)
   - Reference ID (from Cashfree)
   - Status: INITIATED, PROCESSING, SUCCESS, FAILED
   - Amount
   - UPI recipient

### In Your Database

```bash
cd backend
npx prisma studio
```

Open `reward_qr` table and check:
- `cashfree_transfer_id` - Unique ID for this payout
- `cashfree_reference_id` - Cashfree's tracking ID
- `payout_status` - Current status
- `redeemed_at` - When customer claimed
- `redeemed_upi_id` - Which UPI received funds

---

## 🆘 Troubleshooting

### "Invalid credentials"
**Check**:
- [ ] CASHFREE_PAYOUT_CLIENT_ID is not empty
- [ ] CASHFREE_PAYOUT_CLIENT_SECRET is not empty
- [ ] Values are copied exactly from dashboard
- [ ] No extra spaces or quotes

**Fix**:
```bash
# Verify in backend
cd backend
npm start
# Should log: [Cashfree] Successfully authenticated
```

### "Failed to create beneficiary"
**Check**:
- [ ] UPI format is correct (name@upi, not name@gmail.com)
- [ ] Examples that work:
  - harsh@ybl
  - user@okaxis
  - email@icici

**Fix**:
```bash
# Test with known working UPI
curl -X POST https://srisaifoods.onrender.com/api/reward/claim \
  -H "Content-Type: application/json" \
  -d '{"token": "test123", "upiId": "test@ybl"}'
```

### "Failed to initiate payout"
**Check**:
- [ ] Cashfree account has balance/credit
- [ ] Amount is between ₹1 and ₹100,000
- [ ] Payout not rate-limited (max calls per minute)

**Fix**: Contact Cashfree support with transfer ID

### "Payout succeeded but database not updated"
**Cause**: Race condition (rare)  
**Result**: Money reached customer, but you didn't see success message  
**Fix**: Check Cashfree dashboard - payout definitely went through

---

## 📊 Production Checklist

- [ ] Cashfree account created
- [ ] Business verification complete
- [ ] PROD credentials obtained
- [ ] Backend .env updated with PROD credentials
- [ ] CASHFREE_ENV set to PROD
- [ ] Render environment variables updated
- [ ] Service restarted
- [ ] Logs show: [Cashfree] Successfully authenticated (PROD mode)
- [ ] Tested with small amount (₹5)
- [ ] Tested with various UPI providers
- [ ] Error handling verified
- [ ] Logging reviewed (no secrets exposed)
- [ ] Database tracking verified

---

## 💰 Costs

### Cashfree Charges
- **Monthly Fee**: Free for payouts (check current pricing)
- **Per Transaction**: Usually 1-2% or flat rate (check pricing)
- **Minimum Payout**: Usually ₹10-₹50

### Example Costs
If you send 1000 payouts of ₹50 each:
- Total amount: ₹50,000
- Assuming 2% fee: ₹1,000
- Cost per payout: ~₹1

---

## 🔐 Security Best Practices

### Do's ✅
- [ ] Store credentials in .env (not in code)
- [ ] Keep .env in .gitignore
- [ ] Rotate credentials annually
- [ ] Monitor Cashfree transactions
- [ ] Log without exposing secrets
- [ ] Use HTTPS for all API calls

### Don'ts ❌
- [ ] Never commit .env to git
- [ ] Never log API keys
- [ ] Never hardcode credentials
- [ ] Never expose secrets to frontend
- [ ] Never use same credentials everywhere
- [ ] Never share dashboard access

---

## 📞 Support

### Cashfree Support
- **Dashboard**: https://merchant.cashfree.com
- **Docs**: https://docs.cashfree.com/payout
- **Email**: support@cashfree.com
- **Chat**: In-dashboard live chat

### Common Issues Forum
- https://community.cashfree.com

### Your System Logs
```bash
# Real-time logs
npm run dev

# Look for [Cashfree] tags in output
```

---

## ✅ Verification

### How to Know It's Working

1. **Backend Log**:
```
[Cashfree] Successfully authenticated (PROD mode)
```

2. **Claim Response**:
```json
{
  "payoutStatus": "INITIATED",
  "transferId": "cf_reward_..."
}
```

3. **Cashfree Dashboard**:
Transaction visible under **Transactions** → **Payout**

4. **Customer**:
Money appears in UPI ID within 5-30 minutes

---

## 🎓 How It Works (Technical)

```
Your Backend                    Cashfree Servers
┌────────────────────┐         ┌──────────────────┐
│ claimReward()      │         │ Payout API       │
└────────┬───────────┘         └──────────────────┘
         │
         ├─→ 1. getAccessToken()
         │      [Uses CASHFREE_PAYOUT_CLIENT_SECRET]
         │      ↓
         │      ← Returns Bearer token
         │
         ├─→ 2. createBeneficiary(upiId)
         │      [Registers harsh@ybl]
         │      ↓
         │      ← Returns bene_ID
         │
         ├─→ 3. initiatePayout(beneId, amount)
         │      [Submit ₹50 transfer]
         │      ↓
         │      ← Returns referenceId + status
         │
         ├─→ 4. verifyPayout(transferId)
         │      [Check status]
         │      ↓
         │      ← Returns current status
         │
         ├─→ 5. Database Update
         │      [Save transferId + status]
         │      [Mark REDEEMED]
         │
         └─→ 6. Return Success Response
```

---

## 📚 Next Steps

1. **Now**: Get Cashfree credentials
2. **Next**: Update .env with TEST credentials
3. **Then**: Test with small amounts
4. **When Ready**: Switch to PROD credentials
5. **Finally**: Monitor first few transactions

**Estimated Time**: 30 minutes to get credentials, 2 hours to test

---

**Status**: Ready to configure! 🚀
