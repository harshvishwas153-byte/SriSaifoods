const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const tokenService = require("../services/token.service");

// POST /api/admin/reward/generate
// Body: { amount: number, count: number, campaign?: string }
// Protected by middleware/adminAuth.js (x-admin-key header).
exports.generateRewards = asyncHandler(async (req, res) => {
  const { amount, count, campaign } = req.body || {};

  const numAmount = Number(amount);
  const numCount = Number(count);

  if (!Number.isInteger(numAmount) || numAmount <= 0 || numAmount > 5000) {
    throw new ApiError(400, "amount must be a whole number between 1 and 5000");
  }
  if (!Number.isInteger(numCount) || numCount <= 0 || numCount > 500) {
    throw new ApiError(400, "count must be a whole number between 1 and 500");
  }
  if (campaign !== undefined && typeof campaign !== "string") {
    throw new ApiError(400, "campaign must be a string");
  }

  const rewards = await tokenService.generateRewards({
    amount: numAmount,
    count: numCount,
    campaign,
  });

  res.status(201).json({
    success: true,
    count: rewards.length,
    rewards,
  });
});

/**
 * POST /api/admin/rewards/generate
 * Generates rewards with random cashback amounts from a pool of values.
 *
 * Body: {
 *   count: number (1-5000),
 *   campaign: string (optional),
 *   rewards: number[] (array of cashback values, e.g., [5, 10, 20, 50, 100])
 * }
 *
 * Protected by middleware/adminAuth.js (x-admin-key header).
 * Returns all generated rewards with unique cryptographic tokens.
 */
exports.generateRandomRewards = asyncHandler(async (req, res) => {
  const { count, campaign, rewards } = req.body || {};

  const numCount = Number(count);

  // Validate count
  if (!Number.isInteger(numCount) || numCount <= 0 || numCount > 5000) {
    throw new ApiError(
      400,
      "count must be a whole number between 1 and 5000"
    );
  }

  // Validate campaign (optional)
  if (campaign !== undefined && typeof campaign !== "string") {
    throw new ApiError(400, "campaign must be a string");
  }

  // Validate rewards array
  if (!Array.isArray(rewards)) {
    throw new ApiError(400, "rewards must be an array of numbers");
  }

  if (rewards.length === 0) {
    throw new ApiError(400, "rewards array must contain at least one value");
  }

  // Validate each reward value
  for (let i = 0; i < rewards.length; i++) {
    const reward = Number(rewards[i]);
    if (!Number.isInteger(reward) || reward <= 0 || reward > 5000) {
      throw new ApiError(
        400,
        `rewards[${i}] must be an integer between 1 and 5000`
      );
    }
  }

  // Ensure rewards array contains only unique values
  const uniqueRewards = [...new Set(rewards.map(Number))];

  const generatedRewards = await tokenService.generateRandomRewards({
    count: numCount,
    rewards: uniqueRewards,
    campaign,
  });

  res.status(201).json({
    success: true,
    count: generatedRewards.length,
    campaign: campaign || null,
    rewards: uniqueRewards,
    generated: generatedRewards,
  });
});

/**
 * GET /api/admin/rewards
 * Retrieves all generated rewards sorted by newest first.
 * Protected by middleware/adminAuth.js (x-admin-key header).
 *
 * Returns paginated results with total count.
 */
exports.getAllRewards = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 1000); // Max 1000 per request
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const rewards = await tokenService.getAllRewards();

  // Simple pagination
  const paginatedRewards = rewards.slice(offset, offset + limit);

  res.status(200).json({
    success: true,
    total: rewards.length,
    limit,
    offset,
    count: paginatedRewards.length,
    rewards: paginatedRewards,
  });
});
