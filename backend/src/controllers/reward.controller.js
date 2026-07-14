// Controllers only handle the HTTP layer: read the request, call the
// service, send the response. No database or business logic here.

const asyncHandler = require("../utils/asyncHandler");
const rewardService = require("../services/reward.service");

// GET /api/reward/:token
exports.getReward = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const result = await rewardService.getRewardStatus(token);

  // Unknown token -> 404, but still a normal JSON body (not an
  // exception), since "token not found" is an expected outcome for
  // this endpoint, not a server error.
  const statusCode = result.valid ? 200 : 404;
  res.status(statusCode).json(result);
});

// POST /api/reward/claim
exports.claimReward = asyncHandler(async (req, res) => {
  const { token, upiId } = req.body || {};
  const result = await rewardService.claimReward(token, upiId);
  res.status(200).json(result);
});
