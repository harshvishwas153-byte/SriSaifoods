// Authentication controller for OTP-based admin login

const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const BrevoService = require("../services/brevo.service");
const adminSessionService = require("../services/adminSession.service");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const prisma = new PrismaClient();

/**
 * Generate a random 6-digit OTP
 * @returns {string} 6-digit OTP
 */
function generateOTP() {
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * POST /api/auth/send-otp
 * Send OTP to admin email
 */
exports.sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Validate email format
  if (!email || typeof email !== "string") {
    throw new ApiError(400, "Email is required and must be a string");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Invalid email format");
  }

  // Check if Brevo is configured
  if (!BrevoService.isConfigured()) {
    throw new ApiError(
      503,
      "Email service is not configured. Contact administrator."
    );
  }

  try {
    // Generate 6-digit OTP
    const otp = generateOTP();

    // OTP expires in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Delete previous unused OTPs for this email
    await prisma.adminOTP.deleteMany({
      where: {
        email: email.toLowerCase(),
        verified: false,
      },
    });

    // Create new OTP record
    const otpRecord = await prisma.adminOTP.create({
      data: {
        email: email.toLowerCase(),
        otp,
        expiresAt,
        verified: false,
      },
    });

    // Send OTP via Brevo
    await BrevoService.sendOtpEmail(email, otp);

    console.log(
      `[Auth] OTP sent successfully to ${email} (OTP ID: ${otpRecord.id})`
    );

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
      email: email,
      expiresIn: 300, // seconds
    });
  } catch (error) {
    // If error is from BrevoService, it's already an ApiError
    if (error instanceof ApiError) {
      throw error;
    }

    console.error("[Auth] Error sending OTP:", error);
    throw new ApiError(500, "Failed to send OTP. Please try again.");
  }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP and return admin token
 */
exports.verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  // Validate inputs
  if (!email || typeof email !== "string") {
    throw new ApiError(400, "Email is required and must be a string");
  }

  if (!otp || typeof otp !== "string" || otp.length !== 6) {
    throw new ApiError(400, "OTP must be a 6-digit code");
  }

  if (!/^\d{6}$/.test(otp)) {
    throw new ApiError(400, "OTP must contain only digits");
  }

  try {
    console.log(`[Auth] Verifying OTP for ${email.toLowerCase()}`);

    const otpRecord = await prisma.adminOTP.findUnique({
      where: {
        email_otp: {
          email: email.toLowerCase(),
          otp,
        },
      },
    });

    // Check if OTP exists
    if (!otpRecord) {
      throw new ApiError(400, "Invalid OTP");
    }

    // Check if OTP is already verified
    if (otpRecord.verified) {
      throw new ApiError(400, "OTP has already been used");
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      throw new ApiError(400, "OTP has expired. Request a new one.");
    }

    // Mark OTP as verified
    await prisma.adminOTP.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    const session = adminSessionService.createSession(email);

    console.log(
      `[Auth] OTP verified successfully for ${email} (OTP ID: ${otpRecord.id})`
    );

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      email: email,
      verified: true,
      sessionToken: session.token,
      expiresAt: session.expiresAt,
      expiresIn: session.expiresIn,
    });
  } catch (error) {
    // If error is from validation, it's already an ApiError
    if (error instanceof ApiError) {
      throw error;
    }

    console.error("[Auth] Error verifying OTP:", error);
    throw new ApiError(500, "Failed to verify OTP. Please try again.");
  }
});

/**
 * GET /api/auth/session
 * Validate the current admin session
 */
exports.getSession = asyncHandler(async (req, res) => {
  const token = adminSessionService.getTokenFromRequest(req);
  const session = adminSessionService.validateSessionToken(token);

  res.status(200).json({
    success: true,
    authenticated: true,
    email: session.email,
    expiresAt: session.expiresAt,
  });
});

/**
 * POST /api/auth/logout
 * Clear admin session
 */
exports.logout = asyncHandler(async (req, res) => {
  const token = adminSessionService.getTokenFromRequest(req);
  adminSessionService.destroySessionToken(token);

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});
