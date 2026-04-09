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
import { optionalAuth, requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

const browserRouteFallbacks = {
  "/register": "/register",
  "/login": "/login",
  "/verify-login-code": "/verify-code",
  "/send-verification": "/verify-email",
  "/verify-email": "/verify-email",
  "/forgot-password": "/forgot-password",
  "/reset-password": "/reset-password",
};

function isBrowserNavigation(req) {
  const accept = String(req.headers.accept || "");
  const fetchMode = String(req.headers["sec-fetch-mode"] || "");
  return accept.includes("text/html") || fetchMode === "navigate";
}

function methodNotAllowed(allowedMethods) {
  return (req, res) => {
    if (req.method === "GET" && isBrowserNavigation(req)) {
      const frontendBase = String(process.env.FRONTEND_URL || "").replace(/\/+$/, "");
      const frontendPath = browserRouteFallbacks[req.path];

      if (frontendBase && frontendPath) {
        console.warn("[auth:route] Browser opened API endpoint directly.", {
          method: req.method,
          path: `${req.baseUrl}${req.path}`,
          redirectTo: `${frontendBase}${frontendPath}`,
        });
        return res.redirect(302, `${frontendBase}${frontendPath}`);
      }
    }

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
router.route("/verify-email").post(optionalAuth, verifyEmail).all(methodNotAllowed(["POST"]));
router.route("/resend-code").post(requireAuth, resendCode).all(methodNotAllowed(["POST"]));
router.route("/forgot-password").post(forgotPassword).all(methodNotAllowed(["POST"]));
router.route("/reset-password").post(resetPassword).all(methodNotAllowed(["POST"]));

export default router;
