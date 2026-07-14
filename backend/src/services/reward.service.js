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
    expiresAt: reward.expiresAt ? reward.expiresAt.toISOString() : null,
  };
}

async function preparePayout({ token, upiId, amount }) {
  const transferId = cashfreeService.generateTransferId(token);

  if (!cashfreeService.isConfigured()) {
    console.warn(
      `[Reward] Cashfree is not configured. Queuing manual payout for token ${token}, UPI ${upiId}`
    );

    return {
      transferId,
      referenceId: null,
      payoutStatus: "PENDING_MANUAL_PAYOUT",
      payoutQueued: true,
    };
  }

  try {
    const beneficiary = await cashfreeService.createBeneficiary(
      upiId,
      "Reward Claimant"
    );

    console.log(
      `[Reward] Beneficiary created for ${upiId}: ${beneficiary.beneficiaryId}`
    );
    console.log(`[Reward] Generated transfer ID for claim: ${transferId}`);

    const payout = await cashfreeService.initiatePayout({
      beneficiaryId: beneficiary.beneficiaryId,
      amount,
      transferId,
      upiId,
    });

    console.log(
      `[Reward] Payout initiated: Transfer ID ${payout.transferId}, Reference ID ${payout.referenceId}, Status ${payout.status}`
    );

    const verification = await cashfreeService.verifyPayout(transferId);
    if (verification.status !== "VERIFICATION_FAILED") {
      console.log(`[Reward] Payout verified: ${verification.status}`);
    }

    return {
      transferId,
      referenceId: payout.referenceId,
      payoutStatus: payout.status,
      payoutQueued: false,
    };
  } catch (error) {
    console.error(
      `[Reward] Cashfree payout failed for token ${token}: ${error.message}`
    );
    throw error;
  }
}

async function claimReward(token, upiId) {
  if (!token || typeof token !== "string") {
    throw new ApiError(400, "A valid token is required");
  }

  if (!upiId || typeof upiId !== "string" || !UPI_REGEX.test(upiId.trim())) {
    throw new ApiError(400, "A valid UPI ID is required (e.g. name@upi)");
  }

  const cleanUpi = upiId.trim();
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

  const payout = await preparePayout({
    token,
    upiId: cleanUpi,
    amount: reward.cashbackAmount,
  });

  const result = await prisma.rewardQR.updateMany({
    where: { token, status: "ACTIVE" },
    data: {
      status: "REDEEMED",
      redeemedAt: new Date(),
      redeemedUpiId: cleanUpi,
      cashfreeTransferId: payout.transferId,
      cashfreeReferenceId: payout.referenceId,
      payoutStatus: payout.payoutStatus,
    },
  });

  if (result.count === 0) {
    console.warn(
      `[Reward] Race condition: payout prepared but another claim got to the DB first (Transfer ID: ${payout.transferId})`
    );
    throw new ApiError(
      409,
      "This reward was claimed by another user at the same time. However, your payout may still be processed."
    );
  }

  console.log(
    `[Reward] Successfully claimed: Token ${token}, Amount Rs. ${reward.cashbackAmount}, UPI ${cleanUpi}, Transfer ID ${payout.transferId}`
  );

  return {
    success: true,
    message: payout.payoutQueued
      ? "Reward claimed successfully and queued for payout"
      : "Reward claimed successfully and payout initiated",
    cashbackAmount: reward.cashbackAmount,
    payoutStatus: payout.payoutStatus,
    transferId: payout.transferId,
  };
}

module.exports = { getRewardStatus, claimReward };
