import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/authRoutes.js";
import { requireAuth } from "./middleware/authMiddleware.js";
import taskRoutes from "./routes/taskRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import pool from "./config/db.js";

const app = express();

function normalizeOrigin(origin) {
  return String(origin || "").trim().replace(/\/+$/, "");
}

function getAllowedOrigins() {
  const configuredOrigins = [process.env.FRONTEND_URL, process.env.FRONTEND_URLS]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map(normalizeOrigin)
    .filter(Boolean);

  return new Set([
    ...configuredOrigins,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);
}

function isAllowedOrigin(origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return true;

  if (getAllowedOrigins().has(normalizedOrigin)) {
    return true;
  }

  try {
    const { hostname, protocol } = new URL(normalizedOrigin);
    return (protocol === "https:" || protocol === "http:") && hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

// ── Trust Render's proxy (required for rate-limit + correct IPs)
app.set("trust proxy", 1);

// ── Security headers
app.use(helmet());

// ── Logging
app.use(morgan("dev"));

// ── CORS (only allow your frontend)
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      console.error("[cors] Blocked request from origin", {
        origin,
        allowedOrigins: Array.from(getAllowedOrigins()),
      });

      return callback(new Error("CORS origin not allowed."));
    },
    credentials: true,
  })
);

// ── Body parser
app.use(express.json());

// ── Rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests, please try again later." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth attempts. Try again in 15 minutes." },
});

// Test route
app.get("/", (req, res) => {
  res.send("API Running");
});

// DB test (optionnel)
app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as now");
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB connection failed" });
  }
});

// ── Routes
app.use("/auth", authLimiter, authRoutes);
app.use("/tasks", apiLimiter, taskRoutes);
app.use("/analytics", apiLimiter, analyticsRoutes);

// ── Me
app.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, email_verified, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default app;
