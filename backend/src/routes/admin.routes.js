const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const adminController = require("../controllers/admin.controller");

const router = express.Router();

// POST /api/admin/reward/generate
// Requires header: x-admin-key: <ADMIN_API_KEY>
router.post("/generate", adminAuth, adminController.generateRewards);

module.exports = router;
