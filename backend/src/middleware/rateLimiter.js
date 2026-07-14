// Reward tokens are the only thing protecting a claim from being made
// by someone guessing random strings. Rate limiting the claim endpoint
// makes brute-forcing impractical without affecting normal customers,
// who only ever submit one claim.

const rateLimit = require("express-rate-limit");

const claimRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 claim attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many claim attempts. Please try again later.",
  },
});

module.exports = claimRateLimiter;
