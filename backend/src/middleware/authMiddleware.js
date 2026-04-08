import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization; // "Bearer <token>"
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication failed",
        details: "Missing or invalid Authorization header.",
        code: "AUTH_HEADER_INVALID",
      });
    }

    const token = header.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = { id: payload.id };
    next();
  } catch (err) {
    console.error("[auth:middleware] Token verification failed", { message: err.message });
    return res.status(401).json({
      error: "Authentication failed",
      details: "Invalid or expired token.",
      code: "TOKEN_INVALID_OR_EXPIRED",
    });
  }
};
