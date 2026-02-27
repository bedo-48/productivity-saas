import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import { requireAuth } from "./middleware/authMiddleware.js";
import taskRoutes from "./routes/taskRoutes.js";



import pool from "./config/db.js"; // optionnel, seulement si tu gardes /db-test

const app = express();

// Middlewares
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

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

// Auth routes (IMPORTANT: après const app = express())
app.use("/auth", authRoutes);

// 
app.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// task 
app.use("/tasks", taskRoutes);

export default app;
