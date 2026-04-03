import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail, findUserById, markEmailVerified } from "../models/userModel.js";
import { createCode, findValidCode, markCodeUsed } from "../models/verificationModel.js";
import { sendVerificationEmail } from "../services/emailService.js";

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
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields are required" });
    if (password.length < 8)
      return res.status(400).json({ error: "Password must be at least 8 characters" });

    const existing = await findUserByEmail(email);
    if (existing) return res.status(400).json({ error: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(name, email, hashedPassword);

    const token = signToken(user.id);

    // Send verification email (non-blocking — don't fail if SMTP not configured)
    try {
      const code = generateCode();
      await createCode(user.id, code);
      await sendVerificationEmail(email, code);
    } catch (emailErr) {
      console.warn("Email send failed (SMTP not configured?):", emailErr.message);
    }

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, emailVerified: user.email_verified },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
};

// ── LOGIN ───────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

    const token = signToken(user.id);

    // If not verified, send a fresh code
    if (!user.email_verified) {
      try {
        const code = generateCode();
        await createCode(user.id, code);
        await sendVerificationEmail(email, code);
      } catch (emailErr) {
        console.warn("Email send failed:", emailErr.message);
      }
    }

    res.json({
      user: { id: user.id, name: user.name, email: user.email, emailVerified: user.email_verified },
      token,
      requiresVerification: !user.email_verified,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
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

    res.json({ message: "Verification code sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send code" });
  }
};

// ── VERIFY EMAIL ─────────────────────────────────────────────
export const verifyEmail = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    const record = await findValidCode(userId, code);
    if (!record) return res.status(400).json({ error: "Invalid or expired code" });

    await markCodeUsed(record.id);
    await markEmailVerified(userId);

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Verification failed" });
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

    res.json({ message: "New code sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to resend code" });
  }
};
