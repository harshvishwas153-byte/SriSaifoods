const crypto = require("crypto");
const ApiError = require("../utils/ApiError");
const { ADMIN_SESSION_SECRET } = require("../config/env");

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const sessions = new Map();

const sessionSecret =
  ADMIN_SESSION_SECRET ||
  crypto
    .createHash("sha256")
    .update(`${process.env.DATABASE_URL || ""}:${process.env.FROM_EMAIL || ""}`)
    .digest("hex");

function signSession(sessionId, email, expiresAt) {
  return crypto
    .createHmac("sha256", sessionSecret)
    .update(`${sessionId}.${email}.${expiresAt}`)
    .digest("hex");
}

function createSession(email) {
  const normalizedEmail = String(email).toLowerCase();
  const sessionId = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const signature = signSession(sessionId, normalizedEmail, expiresAt);
  const token = `${sessionId}.${expiresAt}.${signature}`;

  sessions.set(sessionId, {
    email: normalizedEmail,
    expiresAt,
  });

  return {
    token,
    email: normalizedEmail,
    expiresAt: new Date(expiresAt).toISOString(),
    expiresIn: Math.floor(SESSION_TTL_MS / 1000),
  };
}

function parseToken(token) {
  if (!token || typeof token !== "string") {
    throw new ApiError(401, "Admin session is required");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new ApiError(401, "Invalid admin session");
  }

  const [sessionId, expiresAtRaw, signature] = parts;
  const expiresAt = Number(expiresAtRaw);

  if (!sessionId || !Number.isFinite(expiresAt) || !signature) {
    throw new ApiError(401, "Invalid admin session");
  }

  return { sessionId, expiresAt, signature };
}

function validateSessionToken(token) {
  const { sessionId, expiresAt, signature } = parseToken(token);
  const session = sessions.get(sessionId);

  if (!session) {
    throw new ApiError(401, "Admin session expired. Please log in again.");
  }

  if (Date.now() > expiresAt || Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    throw new ApiError(401, "Admin session expired. Please log in again.");
  }

  const expectedSignature = signSession(sessionId, session.email, expiresAt);
  const provided = Buffer.from(signature, "hex");
  const expected = Buffer.from(expectedSignature, "hex");

  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    throw new ApiError(401, "Invalid admin session");
  }

  return {
    sessionId,
    email: session.email,
    expiresAt: new Date(session.expiresAt).toISOString(),
  };
}

function destroySessionToken(token) {
  try {
    const { sessionId } = parseToken(token);
    sessions.delete(sessionId);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      return;
    }
    throw error;
  }
}

function getTokenFromRequest(req) {
  const authHeader = req.header("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

module.exports = {
  createSession,
  validateSessionToken,
  destroySessionToken,
  getTokenFromRequest,
};
