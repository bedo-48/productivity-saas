// backend/src/routes/taskRoutes.js

import express from "express";
import {
  addTask,
  getMyTasks,
  deleteTask,
  patchTaskCompleted
} from "../controllers/taskController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// CREATE
router.post("/", requireAuth, addTask);

// READ
router.get("/", requireAuth, getMyTasks);

// DELETE
router.delete("/:id", requireAuth, deleteTask);

// UPDATE (completed true/false)
router.patch("/:id", requireAuth, patchTaskCompleted);

export default router;