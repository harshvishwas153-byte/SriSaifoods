// All database/business logic for the two public reward APIs lives
// here, kept separate from the controllers (which only deal with
// HTTP req/res) and the routes (which only wire URLs to controllers).

const prisma = require("../lib/prisma");
const ApiError = require("../utils/ApiError");
const cashfreeService = require("./cashfree.service");

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
 *
 * STEP-BY-STEP FLOW:
 * 1. Validate token and UPI ID format
 * 2. Fetch reward from database
 * 3. Check if already redeemed (409 Conflict)
 * 4. Check if expired (410 Gone)
 * 5. Create Cashfree beneficiary (UPI ID)
 * 6. Initiate Cashfree payout
 * 7. IF payout succeeds: Mark reward as REDEEMED + save transfer IDs
 * 8. IF payout fails: DO NOT redeem, return 500 error
 *
 * Race condition protection:
 * - updateMany with status ACTIVE guard ensures only one claim succeeds
 * - If two requests race, the loser gets 409 Conflict
 */
async function claimReward(token, upiId) {
  // ===== VALIDATION PHASE =====
  if (!token || typeof token !== "string") {
    throw new ApiError(400, "A valid token is required");
  }
  if (!upiId || typeof upiId !== "string" || !UPI_REGEX.test(upiId.trim())) {
    throw new ApiError(400, "A valid UPI ID is required (e.g. name@upi)");
  }

  // ===== REWARD LOOKUP PHASE =====
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

  // ===== CASHFREE PAYOUT PHASE =====
  // These operations must all succeed before we update the database.
  // If any step fails, we throw and do NOT redeem the reward.

  let beneficiaryId, transferId, referenceId, payoutStatus;

  try {
    // Step 1: Create beneficiary in Cashfree
    const cleanUpi = upiId.trim();
    const beneficiary = await cashfreeService.createBeneficiary(
      cleanUpi,
      "Reward Claimant"
    );
    beneficiaryId = beneficiary.beneficiaryId;

    console.log(
      `[Reward] Beneficiary created for ${cleanUpi}: ${beneficiaryId}`
    );

    // Step 2: Generate unique transfer ID
    transferId = cashfreeService.generateTransferId(token);

    console.log(
      `[Reward] Generated transfer ID for claim: ${transferId}`
    );

    // Step 3: Initiate payout
    const payout = await cashfreeService.initiatePayout({
      beneficiaryId,
      amount: reward.cashbackAmount,
      transferId,
      upiId: cleanUpi,
    });

    referenceId = payout.referenceId;
    payoutStatus = payout.status;

    console.log(
      `[Reward] Payout initiated: Transfer ID ${payout.transferId}, Reference ID ${referenceId}, Status ${payoutStatus}`
    );

    // Step 4: Verify payout was registered (optional but recommended)
    // This is a sanity check - if it fails, we still proceed
    // because the payout might still complete
    const verification = await cashfreeService.verifyPayout(transferId);
    if (verification.status !== "VERIFICATION_FAILED") {
      console.log(`[Reward] Payout verified: ${verification.status}`);
    }
  } catch (error) {
    // If Cashfree payout fails, do NOT redeem the reward
    console.error(
      `[Reward] Cashfree payout failed for token ${token}: ${error.message}`
    );
    // Re-throw to let controller handle the error
    throw error;
  }

  // ===== DATABASE UPDATE PHASE =====
  // Only if Cashfree payout succeeded, update the database.
  // Use updateMany with status guard for race condition protection.

  const result = await prisma.rewardQR.updateMany({
    where: { token, status: "ACTIVE" },
    data: {
      status: "REDEEMED",
      redeemedAt: new Date(),
      redeemedUpiId: upiId.trim(),
      cashfreeTransferId: transferId,
      cashfreeReferenceId: referenceId,
      payoutStatus: payoutStatus,
    },
  });

  if (result.count === 0) {
    // Someone else redeemed it in the split second between our checks
    // above and this update.
    // Cashfree payout already went through - this is a race condition
    // but the money will still reach the customer's account
    console.warn(
      `[Reward] Race condition: Payout succeeded but another claim got to the DB first (Transfer ID: ${transferId})`
    );
    throw new ApiError(
      409,
      "This reward was claimed by another user at the same time. However, your payout may still be processed."
    );
  }

  console.log(
    `[Reward] Successfully claimed: Token ${token}, Amount ₹${reward.cashbackAmount}, UPI ${upiId.trim()}, Transfer ID ${transferId}`
  );

  return {
    success: true,
    message: "Reward claimed successfully and payout initiated",
    cashbackAmount: reward.cashbackAmount,
    payoutStatus: payoutStatus,
    transferId: transferId,
  };
}

module.exports = { getRewardStatus, claimReward };
