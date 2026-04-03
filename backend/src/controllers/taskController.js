import {
  createTask,
  getActiveTasks,
  getArchivedTasks,
  getSharedTasks,
  findTaskById,
  updateTaskCompleted,
  updateTask,
  archiveTask,
  restoreTask,
  deleteTaskById,
  shareTask,
  removeShare,
  getCollaborators,
  logActivity,
} from "../models/taskModel.js";
import { findUserByEmail, findUserById } from "../models/userModel.js";
import { sendTaskSharedEmail } from "../services/emailService.js";

// ── ADD TASK ─────────────────────────────────────────────────
export const addTask = async (req, res) => {
  try {
    const { title, description, priority, due_date } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Title is required" });

    const task = await createTask(req.user.id, title.trim(), description, priority, due_date);
    await logActivity(task.id, req.user.id, "created");
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create task" });
  }
};

// ── GET TASKS (active / archived / shared) ───────────────────
export const getMyTasks = async (req, res) => {
  try {
    const { status } = req.query;
    let tasks;
    if (status === "archived") {
      tasks = await getArchivedTasks(req.user.id);
    } else if (status === "shared") {
      tasks = await getSharedTasks(req.user.id);
    } else {
      tasks = await getActiveTasks(req.user.id);
    }
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE TASK ──────────────────────────────────────────────
export const deleteTask = async (req, res) => {
  try {
    const deleted = await deleteTaskById(req.user.id, Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: "Task not found" });

    const io = req.app.get("io");
    io?.to(`task:${req.params.id}`).emit("task:deleted", { taskId: Number(req.params.id) });

    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ── PATCH TASK (completed + title/description/priority/due_date) ──
export const patchTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = Number(req.params.id);
    const { completed, title, description, priority, due_date } = req.body;

    let updated;
    if (completed !== undefined) {
      updated = await updateTaskCompleted(userId, taskId, completed);
      if (updated) await logActivity(taskId, userId, completed ? "completed" : "reopened");
    } else {
      updated = await updateTask(userId, taskId, { title, description, priority, due_date });
      if (updated) await logActivity(taskId, userId, "updated");
    }

    if (!updated) return res.status(404).json({ error: "Task not found" });

    const io = req.app.get("io");
    io?.to(`task:${taskId}`).emit("task:updated", { task: updated });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ── ARCHIVE TASK ─────────────────────────────────────────────
export const archiveTaskHandler = async (req, res) => {
  try {
    const archived = await archiveTask(req.user.id, Number(req.params.id));
    if (!archived) return res.status(404).json({ error: "Task not found" });
    await logActivity(archived.id, req.user.id, "archived");
    res.json(archived);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ── RESTORE TASK ─────────────────────────────────────────────
export const restoreTaskHandler = async (req, res) => {
  try {
    const restored = await restoreTask(req.user.id, Number(req.params.id));
    if (!restored) return res.status(404).json({ error: "Task not found" });
    await logActivity(restored.id, req.user.id, "restored");
    res.json(restored);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ── SHARE TASK ───────────────────────────────────────────────
export const shareTaskHandler = async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const { email, permission = "view" } = req.body;

    const task = await findTaskById(taskId);
    if (!task || task.user_id !== req.user.id)
      return res.status(403).json({ error: "Not authorized" });

    const targetUser = await findUserByEmail(email);
    if (!targetUser) return res.status(404).json({ error: "User not found with that email" });
    if (targetUser.id === req.user.id)
      return res.status(400).json({ error: "You cannot share a task with yourself" });

    const share = await shareTask(taskId, targetUser.id, permission);
    await logActivity(taskId, req.user.id, "shared", { with: email, permission });

    // Notify via socket
    const io = req.app.get("io");
    io?.to(`user:${targetUser.id}`).emit("task:shared", {
      task,
      sharedBy: req.user.id,
      permission,
    });

    // Send email (non-blocking)
    const me = await findUserById(req.user.id);
    sendTaskSharedEmail(email, me?.name || "Someone", task.title).catch(() => {});

    res.json(share);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ── GET COLLABORATORS ────────────────────────────────────────
export const getCollaboratorsHandler = async (req, res) => {
  try {
    const collaborators = await getCollaborators(Number(req.params.id));
    res.json(collaborators);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── REMOVE SHARE ─────────────────────────────────────────────
export const removeShareHandler = async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const task = await findTaskById(taskId);
    if (!task || task.user_id !== req.user.id)
      return res.status(403).json({ error: "Not authorized" });
    await removeShare(taskId, targetUserId);
    res.json({ message: "Collaborator removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// legacy alias
export const patchTaskCompleted = patchTask;
