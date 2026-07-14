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

module.exports = {
  PORT: Number(process.env.PORT || 4000),
  NODE_ENV: process.env.NODE_ENV || "development",

  DATABASE_URL: requireEnv("DATABASE_URL"),

  // Days a freshly generated QR stays claimable.
  REWARD_EXPIRY_DAYS: Number(process.env.REWARD_EXPIRY_DAYS || 90),

  // Admin QR-generation route is disabled unless this is set.
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || null,

  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
};
