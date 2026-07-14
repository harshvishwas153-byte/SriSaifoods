// All database/business logic for the two public reward APIs lives
// here, kept separate from the controllers (which only deal with
// HTTP req/res) and the routes (which only wire URLs to controllers).

const prisma = require("../lib/prisma");
const ApiError = require("../utils/ApiError");

// Basic UPI ID shape check: something@something (e.g. name@upi, 98765@okhdfc).
// Not a full validation of real UPI handles, just enough to reject garbage input.
const UPI_REGEX = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;

function isPastExpiry(reward) {
  return Boolean(reward.expiresAt && new Date() > reward.expiresAt);
}

/**
 * GET /api/reward/:token
 * Looks up a token and reports its current claimability, without
 * changing anything in the database.
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
     expiresAt: reward.expiresAt
        ? reward.expiresAt.toISOString()
        : null,
  };
}

/**
 * POST /api/reward/claim
 * Validates the token + UPI ID, then atomically marks the QR as
 * REDEEMED so the same token can never be claimed twice, even under
 * concurrent requests.
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

  // Guard against two simultaneous claims on the same token: only the
  // request that actually flips status ACTIVE -> REDEEMED "wins".
  // updateMany's `where: { status: 'ACTIVE' }` makes this atomic at
  // the database level (no separate read-then-write race window).
  const result = await prisma.rewardQR.updateMany({
    where: { token, status: "ACTIVE" },
    data: {
      status: "REDEEMED",
      redeemedAt: new Date(),
      redeemedUpiId: upiId.trim(),
    },
  });

  if (result.count === 0) {
    // Someone else redeemed it in the split second between our checks
    // above and this update.
    throw new ApiError(409, "This reward has already been claimed");
  }

  return {
    success: true,
    message: "Reward claimed successfully",
    cashbackAmount: reward.cashbackAmount,
  };
}

module.exports = { getRewardStatus, claimReward };
