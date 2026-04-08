import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  markEmailVerified,
} from "../models/userModel.js";
import {
  createCode,
  findCodeByValue,
  findCodeRecord,
  findLatestCode,
  markCodeUsed,
} from "../models/verificationModel.js";
import {
  sendLoginCodeEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../services/emailService.js";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.email_verified,
  };
}

function isCodeExpired(record) {
  return new Date(record.expires_at).getTime() <= Date.now();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeCode(code) {
  return String(code || "").trim();
}

function sendAuthError(res, status, error, details, code) {
  return res.status(status).json({ error, details, code });
}

function logAuthFailure(context, details, meta = {}) {
  console.error(`[auth:${context}] ${details}`, meta);
}

function logAuthException(context, err, meta = {}) {
  console.error(`[auth:${context}] Unexpected error`, { message: err.message, ...meta, stack: err.stack });
}

function validateSixDigitCode(code) {
  if (!code) {
    return {
      status: 400,
      error: "Verification failed",
      details: "A 6-digit verification code is required.",
      code: "CODE_MISSING",
    };
  }

  if (!/^\d{6}$/.test(code)) {
    return {
      status: 400,
      error: "Verification failed",
      details: "The verification code must be exactly 6 digits.",
      code: "CODE_INVALID_FORMAT",
    };
  }

  return null;
}

async function resolveCodeRecord({ user, code, type, context, missingRequestMessage }) {
  const latestRecord = await findLatestCode(user.id, type);
  if (!latestRecord) {
    logAuthFailure(context, missingRequestMessage, { userId: user.id, email: user.email, type });
    return {
      ok: false,
      status: 404,
      error: "Verification failed",
      details: missingRequestMessage,
      code: "VERIFICATION_NOT_FOUND",
    };
  }

  const matchingRecord = await findCodeRecord(user.id, code, type);
  if (!matchingRecord) {
    const codeOwnerRecord = await findCodeByValue(code, type);

    if (codeOwnerRecord && codeOwnerRecord.user_id !== user.id) {
      const details = type === "password_reset"
        ? "Reset token verification failed because the code does not match the email provided."
        : "The verification code does not match the email provided.";
      logAuthFailure(context, details, {
        expectedUserId: user.id,
        actualUserId: codeOwnerRecord.user_id,
        email: user.email,
        type,
      });
      return {
        ok: false,
        status: 400,
        error: "Verification failed",
        details,
        code: "CODE_EMAIL_MISMATCH",
      };
    }

    const details = "The verification code is incorrect.";
    logAuthFailure(context, details, { userId: user.id, email: user.email, type });
    return {
      ok: false,
      status: 400,
      error: "Verification failed",
      details,
      code: "CODE_INCORRECT",
    };
  }

  if (matchingRecord.used) {
    const details = "This code has already been used.";
    logAuthFailure(context, details, { userId: user.id, email: user.email, type, codeId: matchingRecord.id });
    return {
      ok: false,
      status: 400,
      error: "Verification failed",
      details,
      code: "CODE_ALREADY_USED",
    };
  }

  if (isCodeExpired(matchingRecord)) {
    await markCodeUsed(matchingRecord.id);
    const details = "This verification code has expired. Please request a new one.";
    logAuthFailure(context, details, { userId: user.id, email: user.email, type, codeId: matchingRecord.id });
    return {
      ok: false,
      status: 400,
      error: "Verification failed",
      details,
      code: "CODE_EXPIRED",
    };
  }

  return { ok: true, record: matchingRecord };
}

async function createAndSendCode(user, type) {
  const code = generateCode();
  await createCode(user.id, code, type);

  if (type === "login") {
    await sendLoginCodeEmail(user.email, code);
    return;
  }

  if (type === "password_reset") {
    await sendPasswordResetEmail(user.email, code);
    return;
  }

  await sendVerificationEmail(user.email, code);
}

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password) {
      return sendAuthError(
        res,
        400,
        "Registration failed",
        "Name, email, and password are required.",
        "REQUIRED_FIELDS_MISSING"
      );
    }

    if (password.length < 8) {
      return sendAuthError(
        res,
        400,
        "Registration failed",
        "Password must be at least 8 characters long.",
        "PASSWORD_TOO_SHORT"
      );
    }

    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      logAuthFailure("register", "Email already in use.", { email: normalizedEmail });
      return sendAuthError(res, 400, "Registration failed", "Email already in use.", "EMAIL_IN_USE");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(name.trim(), normalizedEmail, hashedPassword);
    const token = signToken(user.id);

    try {
      await createAndSendCode(user, "verification");
    } catch (emailError) {
      console.warn("Verification email send failed:", emailError.message);
    }

    return res.status(201).json({ user: serializeUser(user), token });
  } catch (err) {
    logAuthException("register", err);
    return sendAuthError(res, 500, "Registration failed", "Registration could not be completed.", "REGISTRATION_FAILED");
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return sendAuthError(
        res,
        400,
        "Login failed",
        "Email and password are required.",
        "REQUIRED_FIELDS_MISSING"
      );
    }

    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      logAuthFailure("login", "No account found with this email.", { email: normalizedEmail });
      return sendAuthError(
        res,
        404,
        "Login failed",
        "No account found with this email. Please create one.",
        "ACCOUNT_NOT_FOUND"
      );
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      logAuthFailure("login", "Incorrect email or password.", { email: normalizedEmail, userId: user.id });
      return sendAuthError(res, 401, "Login failed", "Incorrect email or password.", "INVALID_CREDENTIALS");
    }

    await createAndSendCode(user, "login");

    return res.json({
      message: "Verification code sent.",
      email: normalizedEmail,
      requiresCode: true,
    });
  } catch (err) {
    logAuthException("login", err);
    return sendAuthError(
      res,
      500,
      "Login failed",
      "The login verification code could not be sent.",
      "LOGIN_CODE_SEND_FAILED"
    );
  }
};

export const verifyLoginCode = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = normalizeCode(req.body.code);

    if (!email) {
      return sendAuthError(res, 400, "Verification failed", "Email is required.", "EMAIL_MISSING");
    }

    const codeValidation = validateSixDigitCode(code);
    if (codeValidation) {
      return sendAuthError(res, codeValidation.status, codeValidation.error, codeValidation.details, codeValidation.code);
    }

    const user = await findUserByEmail(email);
    if (!user) {
      logAuthFailure("verify-login-code", "No account found with this email.", { email });
      return sendAuthError(
        res,
        404,
        "Verification failed",
        "No account found with this email. Please create one.",
        "ACCOUNT_NOT_FOUND"
      );
    }

    const resolution = await resolveCodeRecord({
      user,
      code,
      type: "login",
      context: "verify-login-code",
      missingRequestMessage: "No login verification request was found for this email.",
    });

    if (!resolution.ok) {
      return sendAuthError(res, resolution.status, resolution.error, resolution.details, resolution.code);
    }

    await markCodeUsed(resolution.record.id);

    if (!user.email_verified) {
      await markEmailVerified(user.id);
      user.email_verified = true;
    }

    const token = signToken(user.id);
    return res.json({
      message: "Login verified successfully.",
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    logAuthException("verify-login-code", err);
    return sendAuthError(res, 500, "Verification failed", "Login code verification failed.", "LOGIN_CODE_VERIFICATION_FAILED");
  }
};

export const resendLoginCode = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return sendAuthError(res, 400, "Resend failed", "Email is required.", "EMAIL_MISSING");
    }

    const user = await findUserByEmail(email);
    if (!user) {
      logAuthFailure("resend-login-code", "No account found with this email.", { email });
      return sendAuthError(
        res,
        404,
        "Resend failed",
        "No account found with this email. Please create one.",
        "ACCOUNT_NOT_FOUND"
      );
    }

    await createAndSendCode(user, "login");
    return res.json({ message: "A new login code was sent." });
  } catch (err) {
    logAuthException("resend-login-code", err);
    return sendAuthError(res, 500, "Resend failed", "The login code could not be resent.", "LOGIN_CODE_RESEND_FAILED");
  }
};

export const sendVerification = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return sendAuthError(res, 400, "Verification failed", "Email is required.", "EMAIL_MISSING");
    }

    const user = await findUserByEmail(email);
    if (!user) {
      logAuthFailure("send-verification", "No account found with this email.", { email });
      return sendAuthError(
        res,
        404,
        "Verification failed",
        "No account found with this email. Please create one.",
        "ACCOUNT_NOT_FOUND"
      );
    }

    await createAndSendCode(user, "verification");
    return res.json({ message: "Verification code sent." });
  } catch (err) {
    logAuthException("send-verification", err);
    return sendAuthError(res, 500, "Verification failed", "The verification code could not be sent.", "VERIFICATION_CODE_SEND_FAILED");
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const code = normalizeCode(req.body.code);
    const email = normalizeEmail(req.body.email);

    const codeValidation = validateSixDigitCode(code);
    if (codeValidation) {
      return sendAuthError(res, codeValidation.status, codeValidation.error, codeValidation.details, codeValidation.code);
    }

    let user = null;

    if (req.user?.id) {
      user = await findUserById(req.user.id);
    } else if (email) {
      user = await findUserByEmail(email);
    } else {
      return sendAuthError(
        res,
        400,
        "Verification failed",
        "Email is required when no active verification session is available.",
        "EMAIL_MISSING"
      );
    }

    if (!user) {
      logAuthFailure("verify-email", "Verification record not found because the user account no longer exists.", {
        userId: req.user?.id,
        email,
      });
      return sendAuthError(
        res,
        404,
        "Verification failed",
        "The account for this verification request no longer exists.",
        "ACCOUNT_NOT_FOUND"
      );
    }

    const resolution = await resolveCodeRecord({
      user,
      code,
      type: "verification",
      context: "verify-email",
      missingRequestMessage: "No verification request was found for this email.",
    });

    if (!resolution.ok) {
      return sendAuthError(res, resolution.status, resolution.error, resolution.details, resolution.code);
    }

    await markCodeUsed(resolution.record.id);
    await markEmailVerified(user.id);

    return res.json({ message: "Email verified successfully." });
  } catch (err) {
    logAuthException("verify-email", err, { userId: req.user?.id });
    return sendAuthError(res, 500, "Verification failed", "Email verification failed.", "EMAIL_VERIFICATION_FAILED");
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return sendAuthError(res, 400, "Password reset failed", "Email is required.", "EMAIL_MISSING");
    }

    const user = await findUserByEmail(email);
    if (!user) {
      logAuthFailure("forgot-password", "No account found with this email.", { email });
      return sendAuthError(
        res,
        404,
        "Password reset failed",
        "No account found with this email. Please create one.",
        "ACCOUNT_NOT_FOUND"
      );
    }

    await createAndSendCode(user, "password_reset");
    return res.json({ message: "A password reset code was sent.", email });
  } catch (err) {
    logAuthException("forgot-password", err);
    return sendAuthError(
      res,
      500,
      "Password reset failed",
      "The password reset code could not be sent.",
      "RESET_CODE_SEND_FAILED"
    );
  }
};

export const resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = normalizeCode(req.body.code);
    const { newPassword, confirmPassword } = req.body;

    if (!email || !code || !newPassword) {
      return sendAuthError(
        res,
        400,
        "Password reset failed",
        "Email, reset code, and new password are required.",
        "REQUIRED_FIELDS_MISSING"
      );
    }

    if (newPassword.length < 8) {
      return sendAuthError(
        res,
        400,
        "Password reset failed",
        "Password must be at least 8 characters long.",
        "PASSWORD_TOO_SHORT"
      );
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return sendAuthError(
        res,
        400,
        "Password reset failed",
        "Password confirmation does not match.",
        "PASSWORD_CONFIRMATION_MISMATCH"
      );
    }

    const codeValidation = validateSixDigitCode(code);
    if (codeValidation) {
      return sendAuthError(res, codeValidation.status, codeValidation.error, codeValidation.details, codeValidation.code);
    }

    const user = await findUserByEmail(email);
    if (!user) {
      logAuthFailure("reset-password", "No account found with this email.", { email });
      return sendAuthError(
        res,
        404,
        "Password reset failed",
        "No account found with this email. Please create one.",
        "ACCOUNT_NOT_FOUND"
      );
    }

    const resolution = await resolveCodeRecord({
      user,
      code,
      type: "password_reset",
      context: "reset-password",
      missingRequestMessage: "No password reset request was found for this email.",
    });

    if (!resolution.ok) {
      return sendAuthError(res, resolution.status, resolution.error, resolution.details, resolution.code);
    }

    await markCodeUsed(resolution.record.id);

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashed, user.id]);

    return res.json({ message: "Password reset successfully." });
  } catch (err) {
    logAuthException("reset-password", err);
    return sendAuthError(res, 500, "Password reset failed", "The password could not be reset.", "PASSWORD_RESET_FAILED");
  }
};

export const resendCode = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await findUserById(userId);
    if (!user) {
      logAuthFailure("resend-code", "Verification record not found because the user account no longer exists.", { userId });
      return sendAuthError(
        res,
        404,
        "Resend failed",
        "The account for this verification request no longer exists.",
        "ACCOUNT_NOT_FOUND"
      );
    }

    await createAndSendCode(user, "verification");
    return res.json({ message: "New code sent." });
  } catch (err) {
    logAuthException("resend-code", err, { userId: req.user?.id });
    return sendAuthError(res, 500, "Resend failed", "The verification code could not be resent.", "VERIFICATION_CODE_RESEND_FAILED");
  }
};
