import express from "express";
import { addTask, getMyTasks, deleteTask } from "../controllers/taskController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", requireAuth, addTask);
router.get("/", requireAuth, getMyTasks);
router.delete("/:id", requireAuth, deleteTask);

export default router;
