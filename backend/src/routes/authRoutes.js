import express from "express";
import {
  forgotPassword,
  login,
  register,
  resendCode,
  resendLoginCode,
  resetPassword,
  sendVerification,
  verifyEmail,
  verifyLoginCode,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-login-code", verifyLoginCode);
router.post("/resend-login-code", resendLoginCode);
router.post("/send-verification", sendVerification);
router.post("/verify-email", requireAuth, verifyEmail);
router.post("/resend-code", requireAuth, resendCode);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
