/**
 * Cashfree Payout Service
 *
 * Handles all interactions with Cashfree Payout API:
 * - Creating beneficiaries
 * - Initiating payouts
 * - Verifying payout status
 *
 * Credentials loaded from environment variables:
 * - CASHFREE_APP_ID
 * - CASHFREE_CLIENT_SECRET
 * - CASHFREE_PAYOUT_CLIENT_ID
 * - CASHFREE_PAYOUT_CLIENT_SECRET
 * - CASHFREE_ENV (TEST or PROD)
 *
 * Never logs or exposes secrets.
 */

const axios = require("axios");
const crypto = require("crypto");
const ApiError = require("../utils/ApiError");

// Load Cashfree credentials from environment
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_PAYOUT_CLIENT_ID = process.env.CASHFREE_PAYOUT_CLIENT_ID;
const CASHFREE_PAYOUT_CLIENT_SECRET = process.env.CASHFREE_PAYOUT_CLIENT_SECRET;
const CASHFREE_ENV = process.env.CASHFREE_ENV || "TEST";

// Determine API base URL based on environment
const CASHFREE_BASE_URL =
  CASHFREE_ENV === "PROD"
    ? "https://api.cashfree.com"
    : "https://sandbox.cashfree.com";

// Validate that required credentials are configured
function validateCredentials() {
  const missing = [];
  if (!CASHFREE_APP_ID) missing.push("CASHFREE_APP_ID");
  if (!CASHFREE_CLIENT_SECRET) missing.push("CASHFREE_CLIENT_SECRET");
  if (!CASHFREE_PAYOUT_CLIENT_ID) missing.push("CASHFREE_PAYOUT_CLIENT_ID");
  if (!CASHFREE_PAYOUT_CLIENT_SECRET) missing.push("CASHFREE_PAYOUT_CLIENT_SECRET");

  if (missing.length > 0) {
    console.error(
      `[Cashfree] Missing required environment variables: ${missing.join(", ")}`
    );
    throw new Error(
      `Cashfree is not properly configured. Missing: ${missing.join(", ")}`
    );
  }
}

function isConfigured() {
  return Boolean(
    CASHFREE_APP_ID &&
      CASHFREE_CLIENT_SECRET &&
      CASHFREE_PAYOUT_CLIENT_ID &&
      CASHFREE_PAYOUT_CLIENT_SECRET
  );
}

/**
 * Authenticate with Cashfree Payout API
 * Returns access token valid for 1 hour
 *
 * @returns {Promise<string>} Access token
 */
async function getAccessToken() {
  const timestamp = Math.floor(Date.now() / 1000);

  // Generate signature: SHA256(clientId.timestamp.clientSecret)
  const signatureData = `${CASHFREE_PAYOUT_CLIENT_ID}.${timestamp}.${CASHFREE_PAYOUT_CLIENT_SECRET}`;
  const signature = crypto
    .createHash("sha256")
    .update(signatureData)
    .digest("hex");

  try {
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/payout/v1/authorize`,
      {},
      {
        headers: {
          "X-Client-Id": CASHFREE_PAYOUT_CLIENT_ID,
          "X-Client-Secret": CASHFREE_PAYOUT_CLIENT_SECRET,
          "X-Timestamp": timestamp,
          "X-Signature": signature,
        },
      }
    );

    if (!response.data || !response.data.data || !response.data.data.token) {
      console.error(
        "[Cashfree] Authentication response missing token:",
        response.data
      );
      throw new Error("Failed to obtain Cashfree access token");
    }

    console.log(
      `[Cashfree] Successfully authenticated (${CASHFREE_ENV} mode)`
    );
    return response.data.data.token;
  } catch (error) {
    console.error("[Cashfree] Authentication failed:", error.message);
    if (error.response?.data) {
      console.error("[Cashfree] API Response:", error.response.data);
    }
    throw new ApiError(500, "Failed to authenticate with Cashfree");
  }
}

/**
 * Create a beneficiary in Cashfree
 * A beneficiary represents the recipient UPI ID
 *
 * @param {string} upiId - UPI ID (e.g., name@ybl)
 * @param {string} customerName - Customer name for beneficiary
 * @returns {Promise<{beneficiaryId: string}>} Beneficiary details
 */
async function createBeneficiary(upiId, customerName = "Reward Claimant") {
  if (!upiId || !upiId.includes("@")) {
    throw new ApiError(400, "Invalid UPI ID format");
  }

  const accessToken = await getAccessToken();

  // Generate unique beneficiary ID: "bene_" + timestamp + random
  const beneficiaryId = `bene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const beneficiaryData = {
    beneId: beneficiaryId,
    name: customerName.substring(0, 50), // Max 50 chars
    email: "rewards@srisaifoods.com", // Generic email for rewards
    phone: "9999999999", // Placeholder phone
    bankAccount: upiId,
    ifsc: "UPIAXIS", // UPI identifier
    transferMode: "UPI",
  };

  try {
    console.log(`[Cashfree] Creating beneficiary: ${beneficiaryId}`);

    const response = await axios.post(
      `${CASHFREE_BASE_URL}/payout/v1/addBeneficiary`,
      beneficiaryData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Client-Id": CASHFREE_PAYOUT_CLIENT_ID,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data || response.data.status !== "SUCCESS") {
      const errorMsg = response.data?.message || "Failed to create beneficiary";
      console.error(`[Cashfree] Beneficiary creation failed: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(
      `[Cashfree] Beneficiary created successfully: ${beneficiaryId}`
    );

    return {
      beneficiaryId,
      upiId,
    };
  } catch (error) {
    console.error(
      `[Cashfree] Error creating beneficiary for ${upiId}:`,
      error.message
    );
    if (error.response?.data) {
      console.error("[Cashfree] API Error Response:", error.response.data);
    }
    throw new ApiError(500, "Failed to create Cashfree beneficiary");
  }
}

/**
 * Initiate a payout (transfer money to beneficiary)
 *
 * @param {object} payoutData - Payout details
 * @param {string} payoutData.beneficiaryId - Beneficiary ID from createBeneficiary
 * @param {number} payoutData.amount - Amount in rupees
 * @param {string} payoutData.transferId - Unique transfer reference ID
 * @param {string} payoutData.upiId - UPI ID (for logging)
 * @returns {Promise<{transferId: string, referenceId: string, status: string}>} Payout status
 */
async function initiatePayout(payoutData) {
  const { beneficiaryId, amount, transferId, upiId } = payoutData;

  if (!beneficiaryId || !amount || !transferId) {
    throw new ApiError(400, "Missing required payout data");
  }

  if (amount < 1 || amount > 100000) {
    throw new ApiError(400, "Invalid amount: must be between ₹1 and ₹100,000");
  }

  const accessToken = await getAccessToken();

  const payoutRequestData = {
    beneId: beneficiaryId,
    amount: amount.toString(),
    transferId,
    transferMode: "UPI",
    remarks: `Sri Sai Foods Reward Cashback`,
    notifyUrl: process.env.CASHFREE_NOTIFY_URL || null, // Webhook for status updates
  };

  try {
    console.log(
      `[Cashfree] Initiating payout: ₹${amount} to ${upiId} (Transfer ID: ${transferId})`
    );

    const response = await axios.post(
      `${CASHFREE_BASE_URL}/payout/v1/requestTransfer`,
      payoutRequestData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Client-Id": CASHFREE_PAYOUT_CLIENT_ID,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data || response.data.status !== "SUCCESS") {
      const errorMsg = response.data?.message || "Failed to initiate payout";
      console.error(`[Cashfree] Payout initiation failed: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const { referenceId, transferStatus } = response.data.data || {};

    console.log(
      `[Cashfree] Payout initiated successfully. Transfer ID: ${transferId}, Reference ID: ${referenceId}, Status: ${transferStatus}`
    );

    return {
      transferId,
      referenceId: referenceId || null,
      status: transferStatus || "INITIATED",
    };
  } catch (error) {
    console.error(
      `[Cashfree] Error initiating payout for ${upiId}:`,
      error.message
    );
    if (error.response?.data) {
      console.error("[Cashfree] API Error Response:", error.response.data);
    }
    throw new ApiError(500, "Failed to initiate Cashfree payout");
  }
}

/**
 * Verify the status of a payout transfer
 *
 * @param {string} transferId - Transfer ID to check
 * @returns {Promise<{status: string, amount: number, upiId: string}>} Transfer status details
 */
async function verifyPayout(transferId) {
  if (!transferId) {
    throw new ApiError(400, "Transfer ID is required");
  }

  const accessToken = await getAccessToken();

  try {
    console.log(`[Cashfree] Verifying payout status for Transfer ID: ${transferId}`);

    const response = await axios.get(
      `${CASHFREE_BASE_URL}/payout/v1/getTransferStatus?transferId=${transferId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Client-Id": CASHFREE_PAYOUT_CLIENT_ID,
        },
      }
    );

    if (!response.data || response.data.status !== "SUCCESS") {
      const errorMsg = response.data?.message || "Failed to verify payout";
      console.error(`[Cashfree] Payout verification failed: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const { transferStatus, amount, beneficiary } = response.data.data || {};

    console.log(
      `[Cashfree] Transfer status verified: ${transferStatus} (Amount: ₹${amount})`
    );

    return {
      status: transferStatus || "UNKNOWN",
      amount: amount ? Number(amount) : null,
      upiId: beneficiary?.bankAccount || null,
    };
  } catch (error) {
    console.error(
      `[Cashfree] Error verifying payout for Transfer ID ${transferId}:`,
      error.message
    );
    if (error.response?.data) {
      console.error("[Cashfree] API Error Response:", error.response.data);
    }
    // Don't throw here - payout might still succeed, just verification failed
    return {
      status: "VERIFICATION_FAILED",
      amount: null,
      upiId: null,
    };
  }
}

/**
 * Generate a unique transfer ID for a reward claim
 * Format: cf_reward_{timestamp}_{randomHash}
 *
 * @param {string} token - Reward token (for entropy)
 * @returns {string} Unique transfer ID
 */
function generateTransferId(token) {
  const hash = crypto
    .createHash("sha256")
    .update(`${token}${Date.now()}${Math.random()}`)
    .digest("hex")
    .substring(0, 8);
  return `cf_reward_${Date.now()}_${hash}`;
}

// Validate credentials on module load (but don't throw - let it fail at runtime)
try {
  validateCredentials();
} catch (error) {
  console.warn(
    "[Cashfree] Warning: Cashfree credentials not fully configured. Payout will fail at runtime."
  );
}

module.exports = {
  createBeneficiary,
  initiatePayout,
  verifyPayout,
  getAccessToken,
  generateTransferId,
  isConfigured,
  CASHFREE_ENV,
};
