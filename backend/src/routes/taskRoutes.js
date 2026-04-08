import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  addTask,
  archiveTaskHandler,
  deleteTask,
  getActivityHandler,
  getCollaboratorsHandler,
  getMyTasks,
  patchTask,
  removeShareHandler,
  restoreTaskHandler,
  shareTaskHandler,
} from "../controllers/taskController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/activity", getActivityHandler);
router.post("/", addTask);
router.get("/", getMyTasks);
router.delete("/:id", deleteTask);
router.patch("/:id", patchTask);
router.patch("/:id/archive", archiveTaskHandler);
router.patch("/:id/restore", restoreTaskHandler);
router.post("/:id/share", shareTaskHandler);
router.get("/:id/collaborators", getCollaboratorsHandler);
router.delete("/:id/share/:userId", removeShareHandler);

export default router;
