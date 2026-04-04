import express from "express";
import { register, login, sendVerification, verifyEmail, resendCode, forgotPassword, resetPassword } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/send-verification", sendVerification);
router.post("/verify-email", requireAuth, verifyEmail);
router.post("/resend-code", requireAuth, resendCode);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
