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
  findValidCode,
  markCodeUsed,
} from "../models/verificationModel.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/emailService.js";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// ── REGISTER ────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(name, email, hashedPassword);

    const token = signToken(user.id);

    try {
      const code = generateCode();
      await createCode(user.id, code);

      sendVerificationEmail(email, code).catch((emailErr) => {
        console.warn("Email send failed (SMTP not configured?):", emailErr.message);
      });
    } catch (emailErr) {
      console.warn("Verification setup failed:", emailErr.message);
    }

    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.email_verified,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Registration failed" });
  }
};

// ── LOGIN ───────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = signToken(user.id);

    if (!user.email_verified) {
      try {
        const code = generateCode();
        await createCode(user.id, code);

        sendVerificationEmail(email, code).catch((emailErr) => {
          console.warn("Email send failed:", emailErr.message);
        });
      } catch (emailErr) {
        console.warn("Verification setup failed:", emailErr.message);
      }
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.email_verified,
      },
      token,
      requiresVerification: !user.email_verified,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Login failed" });
  }
};

// ── SEND VERIFICATION CODE ──────────────────────────────────
export const sendVerification = async (req, res) => {
  try {
    const user = await findUserByEmail(req.body.email || "");
    if (!user) return res.status(404).json({ error: "User not found" });

    const code = generateCode();
    await createCode(user.id, code);
    await sendVerificationEmail(user.email, code);

    return res.json({ message: "Verification code sent" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to send code" });
  }
};

// ── VERIFY EMAIL ─────────────────────────────────────────────
export const verifyEmail = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    const record = await findValidCode(userId, code);
    if (!record) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    await markCodeUsed(record.id);
    await markEmailVerified(userId);

    return res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Verification failed" });
  }
};

// ── FORGOT PASSWORD ──────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await findUserByEmail(email);
    // Always return success to avoid email enumeration
    if (!user) return res.json({ message: "If that email exists, a reset code was sent." });

    const code = generateCode();
    await createCode(user.id, code, "password_reset");
    await sendPasswordResetEmail(email, code);

    return res.json({ message: "If that email exists, a reset code was sent." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to send reset code" });
  }
};

// ── RESET PASSWORD ───────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword)
      return res.status(400).json({ error: "All fields are required" });
    if (newPassword.length < 8)
      return res.status(400).json({ error: "Password must be at least 8 characters" });

    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: "Invalid code" });

    const record = await findValidCode(user.id, code, "password_reset");
    if (!record) return res.status(400).json({ error: "Invalid or expired code" });

    await markCodeUsed(record.id);

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashed, user.id]);

    return res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Password reset failed" });
  }
};

// ── RESEND CODE ──────────────────────────────────────────────
export const resendCode = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const code = generateCode();
    await createCode(userId, code);
    await sendVerificationEmail(user.email, code);

    return res.json({ message: "New code sent" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to resend code" });
  }
};