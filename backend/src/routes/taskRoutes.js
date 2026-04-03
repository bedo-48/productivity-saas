import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  addTask,
  getMyTasks,
  deleteTask,
  patchTask,
  archiveTaskHandler,
  restoreTaskHandler,
  shareTaskHandler,
  getCollaboratorsHandler,
  removeShareHandler,
} from "../controllers/taskController.js";

const router = express.Router();

// All routes require auth
router.use(requireAuth);

router.post("/", addTask);
router.get("/", getMyTasks);                          // ?status=active|archived|shared
router.delete("/:id", deleteTask);
router.patch("/:id", patchTask);
router.patch("/:id/archive", archiveTaskHandler);
router.patch("/:id/restore", restoreTaskHandler);
router.post("/:id/share", shareTaskHandler);
router.get("/:id/collaborators", getCollaboratorsHandler);
router.delete("/:id/share/:userId", removeShareHandler);

export default router;
