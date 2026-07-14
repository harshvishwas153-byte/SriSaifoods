const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const adminController = require("../controllers/admin.controller");

const router = express.Router();

/**
 * POST /api/admin/rewards/generate
 * Generates rewards with random cashback amounts from a pool of values.
 * Requires header: x-admin-key: <ADMIN_API_KEY>
 *
 * Request body:
 * {
 *   "count": 1000,
 *   "campaign": "Sri Sai Launch",
 *   "rewards": [5, 10, 20, 50, 100]
 * }
 */
router.post("/generate", adminAuth, adminController.generateRandomRewards);

/**
 * GET /api/admin/rewards
 * Retrieves all generated rewards sorted by newest first.
 * Requires header: x-admin-key: <ADMIN_API_KEY>
 *
 * Query parameters:
 * - limit: number (1-1000, default: 100) - results per page
 * - offset: number (default: 0) - pagination offset
 *
 * Response includes total count and paginated results.
 */
router.get("/", adminAuth, adminController.getAllRewards);

module.exports = router;
