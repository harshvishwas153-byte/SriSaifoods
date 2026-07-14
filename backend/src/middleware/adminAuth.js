// Protects the admin-only QR generation route
// (POST /api/admin/reward/generate).
//
// This is intentionally simple (a single shared API key checked via
// header) rather than full auth/login, since only your team should
// ever call it, from a trusted context (an internal tool or script).
// Swap this for real admin authentication before exposing it publicly.

const ApiError = require("../utils/ApiError");
const { ADMIN_API_KEY } = require("../config/env");

module.exports = function adminAuth(req, res, next) {
  if (!ADMIN_API_KEY) {
    return next(
      new ApiError(
        503,
        "Admin routes are disabled. Set ADMIN_API_KEY in your .env to enable them."
      )
    );
  }

  const providedKey = req.header("x-admin-key");

  if (!providedKey || providedKey !== ADMIN_API_KEY) {
    return next(new ApiError(401, "Invalid or missing admin API key"));
  }

  next();
};
