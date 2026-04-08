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

function methodNotAllowed(allowedMethods) {
  return (req, res) => {
    res.set("Allow", allowedMethods.join(", "));
    return res.status(405).json({
      error: "Route not found or incorrect method.",
      details: `Use ${allowedMethods.join("/")} ${req.baseUrl}${req.path} for this auth endpoint.`,
      code: "AUTH_METHOD_NOT_ALLOWED",
    });
  };
}

router.route("/register").post(register).all(methodNotAllowed(["POST"]));
router.route("/login").post(login).all(methodNotAllowed(["POST"]));
router.route("/verify-login-code").post(verifyLoginCode).all(methodNotAllowed(["POST"]));
router.route("/resend-login-code").post(resendLoginCode).all(methodNotAllowed(["POST"]));
router.route("/send-verification").post(sendVerification).all(methodNotAllowed(["POST"]));
router.route("/verify-email").post(requireAuth, verifyEmail).all(methodNotAllowed(["POST"]));
router.route("/resend-code").post(requireAuth, resendCode).all(methodNotAllowed(["POST"]));
router.route("/forgot-password").post(forgotPassword).all(methodNotAllowed(["POST"]));
router.route("/reset-password").post(resetPassword).all(methodNotAllowed(["POST"]));

export default router;
