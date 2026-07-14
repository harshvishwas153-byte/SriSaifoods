const express = require("express");
const rewardController = require("../controllers/reward.controller");
const claimRateLimiter = require("../middleware/rateLimiter");

const router = express.Router();

// GET /api/reward/:token
router.get("/:token", rewardController.getReward);

// POST /api/reward/claim
router.post("/claim", claimRateLimiter, rewardController.claimReward);

module.exports = router;
