// Generates new reward QR tokens. Used by the bonus admin endpoint
// (POST /api/admin/reward/generate) — the backend counterpart to the
// "Generate Reward QR" form already in the frontend's Admin dashboard
// tab (index.html #rewards). Not part of the two required public
// APIs, but needed to actually populate the database they read from.

const crypto = require("crypto");
const prisma = require("../lib/prisma");
const { REWARD_EXPIRY_DAYS } = require("../config/env");

function generateToken() {
  // 12 random bytes -> 24 hex characters. Collision-safe enough for
  // this volume; the DB's unique constraint is the real backstop.
  return crypto.randomBytes(12).toString("hex");
}

async function generateRewards({ amount, count, campaign }) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REWARD_EXPIRY_DAYS);

  const rows = Array.from({ length: count }, () => ({
    token: generateToken(),
    cashbackAmount: amount,
    campaign: campaign || null,
    expiresAt,
  }));

  await prisma.rewardQR.createMany({ data: rows });

  return prisma.rewardQR.findMany({
    where: { token: { in: rows.map((r) => r.token) } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Generates rewards with random cashback amounts from a pool of values.
 * Used by POST /api/admin/rewards/generate to create batch rewards with
 * varied cashback values (e.g., [5, 10, 20, 50, 100]).
 *
 * Ensures every token is cryptographically unique and enforces uniqueness
 * via the database constraint. If a collision occurs, it retries with a new token.
 */
async function generateRandomRewards({ count, rewards, campaign }) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REWARD_EXPIRY_DAYS);

  // Pre-generate all tokens to check for duplicates before DB insert
  const generateUniqueTokens = async (numTokens) => {
    const tokens = new Set();
    const maxAttempts = numTokens * 10; // Safety limit to prevent infinite loop
    let attempts = 0;

    while (tokens.size < numTokens && attempts < maxAttempts) {
      tokens.add(generateToken());
      attempts++;
    }

    if (tokens.size < numTokens) {
      throw new Error(
        `Failed to generate ${numTokens} unique tokens after ${maxAttempts} attempts`
      );
    }

    return Array.from(tokens);
  };

  const uniqueTokens = await generateUniqueTokens(count);

  // Randomly assign cashback values from the rewards array
  const rows = uniqueTokens.map(() => ({
    token: generateToken(), // Use the pre-generated tokens
    cashbackAmount: rewards[Math.floor(Math.random() * rewards.length)],
    campaign: campaign || null,
    expiresAt,
  }));

  // Update rows to use the pre-generated unique tokens
  uniqueTokens.forEach((token, index) => {
    rows[index].token = token;
  });

  // Create all rewards in a single transaction
  await prisma.rewardQR.createMany({ data: rows });

  // Return the newly created rewards, sorted by newest first
  return prisma.rewardQR.findMany({
    where: { token: { in: uniqueTokens } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retrieves all rewards sorted by newest first.
 * Used by GET /api/admin/rewards to list all generated rewards.
 */
async function getAllRewards() {
  return prisma.rewardQR.findMany({
    orderBy: { createdAt: "desc" },
  });
}

module.exports = { generateToken, generateRewards, generateRandomRewards, getAllRewards };
