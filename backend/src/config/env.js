// Loads and validates all environment variables in one place so every
// other file can trust process.env.* has already been checked.

require("dotenv").config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

function optionalEnv(name, defaultValue) {
  return process.env[name] || defaultValue;
}

module.exports = {
  PORT: Number(process.env.PORT || 4000),
  NODE_ENV: process.env.NODE_ENV || "development",

  DATABASE_URL: requireEnv("DATABASE_URL"),

  // Days a freshly generated QR stays claimable.
  REWARD_EXPIRY_DAYS: Number(process.env.REWARD_EXPIRY_DAYS || 90),

  // Optional: set this in production so admin session signatures remain stable across deploys.
  ADMIN_SESSION_SECRET: optionalEnv("ADMIN_SESSION_SECRET", null),

  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",

  // ===== CASHFREE PAYOUT CONFIGURATION =====
  // These enable automatic payouts when customers claim rewards.
  // Get credentials from: https://merchant.cashfree.com/settings/payout
  CASHFREE_APP_ID: optionalEnv("CASHFREE_APP_ID", null),
  CASHFREE_CLIENT_SECRET: optionalEnv("CASHFREE_CLIENT_SECRET", null),
  CASHFREE_PAYOUT_CLIENT_ID: optionalEnv("CASHFREE_PAYOUT_CLIENT_ID", null),
  CASHFREE_PAYOUT_CLIENT_SECRET: optionalEnv(
    "CASHFREE_PAYOUT_CLIENT_SECRET",
    null
  ),

  // Environment: TEST or PROD
  // TEST uses sandbox.cashfree.com, PROD uses api.cashfree.com
  CASHFREE_ENV: optionalEnv("CASHFREE_ENV", "TEST"),

  // Optional webhook URL for Cashfree to notify about payout status changes
  CASHFREE_NOTIFY_URL: optionalEnv("CASHFREE_NOTIFY_URL", null),

  // ===== BREVO EMAIL SERVICE CONFIGURATION =====
  // Used for OTP-based admin authentication
  // Get API key from: https://app.brevo.com/settings/keys/api
  BREVO_API_KEY: optionalEnv("BREVO_API_KEY", null),

  // From email address (must be verified in Brevo)
  FROM_EMAIL: optionalEnv("FROM_EMAIL", "noreply@srisaifoods.com"),

  // From name (displayed in recipient's email client)
  FROM_NAME: optionalEnv("FROM_NAME", "Sri Sai's Fryums"),
};
