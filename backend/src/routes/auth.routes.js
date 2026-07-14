// Authentication routes for OTP-based admin login

const express = require("express");
const authController = require("../controllers/auth.controller");

const router = express.Router();

/**
 * POST /api/auth/send-otp
 * Send OTP to admin email
 * 
 * Request body:
 * {
 *   "email": "admin@example.com"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "OTP sent successfully to your email",
 *   "email": "admin@example.com",
 *   "expiresIn": 300
 * }
 */
router.post("/send-otp", authController.sendOTP);

/**
 * POST /api/auth/verify-otp
 * Verify OTP and authenticate admin
 * 
 * Request body:
 * {
 *   "email": "admin@example.com",
 *   "otp": "123456"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "OTP verified successfully",
 *   "email": "admin@example.com",
 *   "verified": true,
 *   "sessionId": "abc123..."
 * }
 */
router.post("/verify-otp", authController.verifyOTP);

/**
 * POST /api/auth/logout
 * Logout admin session
 */
router.post("/logout", authController.logout);

module.exports = router;
