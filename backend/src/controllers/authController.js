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
  findCodeRecord,
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

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "Email already in use." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(name.trim(), email.trim().toLowerCase(), hashedPassword);
    const token = signToken(user.id);

    try {
      await createAndSendCode(user, "verification");
    } catch (emailError) {
      console.warn("Verification email send failed:", emailError.message);
    }

    return res.status(201).json({ user: serializeUser(user), token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Registration failed." });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    await createAndSendCode(user, "login");

    return res.json({
      message: "Verification code sent.",
      email: normalizedEmail,
      requiresCode: true,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to start login verification." });
  }
};

export const verifyLoginCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required." });
    }

    const user = await findUserByEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(400).json({ error: "Invalid code." });
    }

    const record = await findCodeRecord(user.id, String(code), "login");
    if (!record || record.used) {
      return res.status(400).json({ error: "Invalid code." });
    }

    if (isCodeExpired(record)) {
      await markCodeUsed(record.id);
      return res.status(400).json({ error: "Code expired. Request a new one." });
    }

    await markCodeUsed(record.id);

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
    console.error(err);
    return res.status(500).json({ error: "Code verification failed." });
  }
};

export const resendLoginCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const user = await findUserByEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    await createAndSendCode(user, "login");
    return res.json({ message: "A new login code was sent." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to resend login code." });
  }
};

export const sendVerification = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ error: "User not found." });

    await createAndSendCode(user, "verification");
    return res.json({ message: "Verification code sent." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to send code." });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ error: "Code is required." });
    }

    const record = await findCodeRecord(userId, String(code), "verification");
    if (!record || record.used) {
      return res.status(400).json({ error: "Invalid code." });
    }

    if (isCodeExpired(record)) {
      await markCodeUsed(record.id);
      return res.status(400).json({ error: "Code expired. Request a new one." });
    }

    await markCodeUsed(record.id);
    await markEmailVerified(userId);

    return res.json({ message: "Email verified successfully." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Verification failed." });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    const user = await findUserByEmail(email.trim().toLowerCase());
    if (!user) return res.json({ message: "If that email exists, a reset code was sent." });

    await createAndSendCode(user, "password_reset");
    return res.json({ message: "If that email exists, a reset code was sent." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to send reset code." });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }

    const user = await findUserByEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(400).json({ error: "Invalid code." });
    }

    const record = await findCodeRecord(user.id, String(code), "password_reset");
    if (!record || record.used) {
      return res.status(400).json({ error: "Invalid code." });
    }

    if (isCodeExpired(record)) {
      await markCodeUsed(record.id);
      return res.status(400).json({ error: "Code expired. Request a new one." });
    }

    await markCodeUsed(record.id);

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashed, user.id]);

    return res.json({ message: "Password reset successfully." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Password reset failed." });
  }
};

export const resendCode = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    await createAndSendCode(user, "verification");
    return res.json({ message: "New code sent." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to resend code." });
  }
};
