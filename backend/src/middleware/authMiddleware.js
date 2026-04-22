import jwt from "jsonwebtoken";
import { getFirebaseAuth } from "../config/firebaseAdmin.js";
import { findUserById, upsertUserFromFirebase } from "../models/userModel.js";

const ALLOW_LEGACY_JWT = process.env.ALLOW_LEGACY_JWT !== "false";

function authError(res, status, details, code) {
  return res.status(status).json({
    error: "Authentication failed",
    details,
    code,
  });
}

function extractBearer(header) {
  if (!header || typeof header !== "string") return null;
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

/**
 * Verifies either a Firebase ID token (preferred) or — if ALLOW_LEGACY_JWT
 * is not explicitly disabled — an old-school backend-signed JWT. The resolved
 * PostgreSQL user row is always attached as { id, email, firebaseUid? }.
 *
 * @throws {Error} bubble up verification errors so callers can decide 401/403.
 */
async function resolveUserFromToken(token) {
  // 1. Try Firebase first.
  try {
    const decoded = await getFirebaseAuth().verifyIdToken(token, true);
    const user = await upsertUserFromFirebase({
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified,
      name: decoded.name,
      picture: decoded.picture,
    });
    return { id: user.id, email: user.email, firebaseUid: decoded.uid };
  } catch (firebaseErr) {
    // Fall through to legacy JWT if allowed; otherwise surface the Firebase error.
    if (!ALLOW_LEGACY_JWT || !process.env.JWT_SECRET) {
      throw firebaseErr;
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await findUserById(payload.id);
      if (!user) {
        const err = new Error("User referenced by legacy JWT no longer exists.");
        err.code = "LEGACY_USER_NOT_FOUND";
        throw err;
      }
      return { id: user.id, email: user.email, legacy: true };
    } catch (jwtErr) {
      // Re-throw the Firebase error — it's the more informative one for modern clients.
      throw firebaseErr;
    }
  }
}

export const optionalAuth = async (req, _res, next) => {
  const token = extractBearer(req.headers.authorization);
  if (!token) return next();

  try {
    req.user = await resolveUserFromToken(token);
  } catch (err) {
    console.warn("[auth:optional] Token verification failed", { message: err.message });
  }

  next();
};

export const requireAuth = async (req, res, next) => {
  const token = extractBearer(req.headers.authorization);
  if (!token) {
    return authError(
      res,
      401,
      "Missing or invalid Authorization header.",
      "AUTH_HEADER_INVALID"
    );
  }

  try {
    req.user = await resolveUserFromToken(token);
    return next();
  } catch (err) {
    const message = String(err?.message || "");
    console.error("[auth:middleware] Token verification failed", {
      message,
      code: err?.code,
    });

    if (err?.code === "auth/id-token-expired" || /expired/i.test(message)) {
      return authError(res, 401, "Your session has expired. Please sign in again.", "TOKEN_EXPIRED");
    }

    return authError(
      res,
      401,
      "Invalid or expired token.",
      "TOKEN_INVALID_OR_EXPIRED"
    );
  }
};
