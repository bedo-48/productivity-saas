import {
  archiveTask,
  createTask,
  deleteTaskById,
  findTaskById,
  getActiveTasks,
  getArchivedTasks,
  getCollaborators,
  getRecentActivity,
  getSharedTasks,
  logActivity,
  removeShare,
  restoreTask,
  shareTask,
  updateTask,
  updateTaskCompleted,
} from "../models/taskModel.js";
import { findUserByEmail, findUserById } from "../models/userModel.js";
import { sendTaskSharedEmail } from "../services/emailService.js";

const VALID_PRIORITIES = new Set(["low", "medium", "high"]);
const VALID_PERMISSIONS = new Set(["view", "edit"]);

function apiError(res, status, details, code, error = "Request failed") {
  return res.status(status).json({ error, details, code });
}

function logCtl(context, err, meta = {}) {
  console.error(`[tasks:${context}]`, { message: err?.message, code: err?.code, ...meta });
}

function normalizePriority(priority) {
  if (priority === undefined || priority === null || priority === "") return undefined;
  const lowered = String(priority).toLowerCase();
  return VALID_PRIORITIES.has(lowered) ? lowered : null; // null = invalid
}

function normalizeDueDate(dueDate) {
  if (dueDate === undefined) return undefined;
  if (dueDate === null || dueDate === "") return null;
  const parsed = new Date(dueDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function validateTaskPayload(body, { requireTitle = false } = {}) {
  const errors = [];
  const payload = {};

  if (body.title !== undefined) {
    const title = String(body.title || "").trim();
    if (!title) errors.push({ field: "title", message: "Title cannot be empty." });
    else if (title.length > 255)
      errors.push({ field: "title", message: "Title must be 255 characters or fewer." });
    else payload.title = title;
  } else if (requireTitle) {
    errors.push({ field: "title", message: "Title is required." });
  }

  if (body.description !== undefined) {
    if (body.description === null) payload.description = null;
    else payload.description = String(body.description);
  }

  if (body.priority !== undefined) {
    const normalized = normalizePriority(body.priority);
    if (normalized === null) {
      errors.push({
        field: "priority",
        message: `Priority must be one of: ${[...VALID_PRIORITIES].join(", ")}.`,
      });
    } else if (normalized !== undefined) {
      payload.priority = normalized;
    }
  }

  if (body.due_date !== undefined) {
    const normalized = normalizeDueDate(body.due_date);
    if (normalized === null && body.due_date !== null && body.due_date !== "") {
      errors.push({ field: "due_date", message: "Due date must be a valid ISO date." });
    } else {
      payload.due_date = normalized;
    }
  }

  if (body.completed !== undefined) {
    if (typeof body.completed !== "boolean") {
      errors.push({ field: "completed", message: "Completed must be true or false." });
    } else {
      payload.completed = body.completed;
    }
  }

  return { errors, payload };
}

function parseIdParam(value, field = "id") {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { error: `${field} must be a positive integer.` };
  }
  return { value: parsed };
}

function sendValidationErrors(res, errors) {
  return res.status(400).json({
    error: "Validation failed",
    details: errors.map((e) => `${e.field}: ${e.message}`).join(" "),
    code: "VALIDATION_FAILED",
    fields: errors,
  });
}

export const addTask = async (req, res) => {
  try {
    const { errors, payload } = validateTaskPayload(req.body, { requireTitle: true });
    if (errors.length) return sendValidationErrors(res, errors);

    const task = await createTask(
      req.user.id,
      payload.title,
      payload.description ?? null,
      payload.priority ?? "medium",
      payload.due_date ?? null
    );
    await logActivity(task.id, req.user.id, "created");
    res.status(201).json(task);
  } catch (err) {
    logCtl("addTask", err, { userId: req.user?.id });
    apiError(res, 500, "Failed to create task.", "TASK_CREATE_FAILED");
  }
};

export const getMyTasks = async (req, res) => {
  try {
    const { status } = req.query;
    if (status && !["active", "archived", "shared"].includes(status)) {
      return apiError(
        res,
        400,
        "status must be one of: active, archived, shared.",
        "INVALID_STATUS_FILTER"
      );
    }
    let tasks;
    if (status === "archived") tasks = await getArchivedTasks(req.user.id);
    else if (status === "shared") tasks = await getSharedTasks(req.user.id);
    else tasks = await getActiveTasks(req.user.id);
    res.json(tasks);
  } catch (err) {
    logCtl("getMyTasks", err, { userId: req.user?.id });
    apiError(res, 500, "Failed to fetch tasks.", "TASK_FETCH_FAILED");
  }
};

export const getActivityHandler = async (req, res) => {
  try {
    const activity = await getRecentActivity(req.user.id);
    res.json(activity);
  } catch (err) {
    logCtl("getActivity", err, { userId: req.user?.id });
    apiError(res, 500, "Failed to fetch activity log.", "ACTIVITY_FETCH_FAILED");
  }
};

export const deleteTask = async (req, res) => {
  try {
    const idResult = parseIdParam(req.params.id);
    if (idResult.error) return apiError(res, 400, idResult.error, "INVALID_TASK_ID");

    const deleted = await deleteTaskById(req.user.id, idResult.value);
    if (!deleted) return apiError(res, 404, "Task not found.", "TASK_NOT_FOUND");

    const io = req.app.get("io");
    io?.to(`task:${idResult.value}`).emit("task:deleted", { taskId: idResult.value });

    res.json({ message: "Task deleted." });
  } catch (err) {
    logCtl("deleteTask", err, { userId: req.user?.id, taskId: req.params.id });
    apiError(res, 500, "Failed to delete task.", "TASK_DELETE_FAILED");
  }
};

export const patchTask = async (req, res) => {
  try {
    const idResult = parseIdParam(req.params.id);
    if (idResult.error) return apiError(res, 400, idResult.error, "INVALID_TASK_ID");

    const { errors, payload } = validateTaskPayload(req.body);
    if (errors.length) return sendValidationErrors(res, errors);
    if (Object.keys(payload).length === 0) {
      return apiError(res, 400, "No updatable fields supplied.", "EMPTY_UPDATE");
    }

    const userId = req.user.id;
    const taskId = idResult.value;

    let updated;
    if (payload.completed !== undefined) {
      updated = await updateTaskCompleted(userId, taskId, payload.completed);
      if (updated) await logActivity(taskId, userId, payload.completed ? "completed" : "reopened");
    } else {
      updated = await updateTask(userId, taskId, {
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        due_date: payload.due_date,
      });
      if (updated) await logActivity(taskId, userId, "updated");
    }

    if (!updated) return apiError(res, 404, "Task not found.", "TASK_NOT_FOUND");

    const io = req.app.get("io");
    io?.to(`task:${taskId}`).emit("task:updated", { task: updated });

    res.json(updated);
  } catch (err) {
    logCtl("patchTask", err, { userId: req.user?.id, taskId: req.params.id });
    apiError(res, 500, "Failed to update task.", "TASK_UPDATE_FAILED");
  }
};

export const archiveTaskHandler = async (req, res) => {
  try {
    const idResult = parseIdParam(req.params.id);
    if (idResult.error) return apiError(res, 400, idResult.error, "INVALID_TASK_ID");

    const archived = await archiveTask(req.user.id, idResult.value);
    if (!archived) return apiError(res, 404, "Task not found.", "TASK_NOT_FOUND");
    await logActivity(archived.id, req.user.id, "archived");
    res.json(archived);
  } catch (err) {
    logCtl("archiveTask", err, { userId: req.user?.id, taskId: req.params.id });
    apiError(res, 500, "Failed to archive task.", "TASK_ARCHIVE_FAILED");
  }
};

export const restoreTaskHandler = async (req, res) => {
  try {
    const idResult = parseIdParam(req.params.id);
    if (idResult.error) return apiError(res, 400, idResult.error, "INVALID_TASK_ID");

    const restored = await restoreTask(req.user.id, idResult.value);
    if (!restored) return apiError(res, 404, "Task not found.", "TASK_NOT_FOUND");
    await logActivity(restored.id, req.user.id, "restored");
    res.json(restored);
  } catch (err) {
    logCtl("restoreTask", err, { userId: req.user?.id, taskId: req.params.id });
    apiError(res, 500, "Failed to restore task.", "TASK_RESTORE_FAILED");
  }
};

export const shareTaskHandler = async (req, res) => {
  try {
    const idResult = parseIdParam(req.params.id);
    if (idResult.error) return apiError(res, 400, idResult.error, "INVALID_TASK_ID");

    const { email, permission = "view" } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) return apiError(res, 400, "Collaborator email is required.", "EMAIL_REQUIRED");
    if (!VALID_PERMISSIONS.has(permission)) {
      return apiError(
        res,
        400,
        `Permission must be one of: ${[...VALID_PERMISSIONS].join(", ")}.`,
        "INVALID_PERMISSION"
      );
    }

    const taskId = idResult.value;
    const task = await findTaskById(taskId);
    if (!task || task.user_id !== req.user.id) {
      return apiError(res, 403, "Not authorized to share this task.", "SHARE_FORBIDDEN");
    }

    const targetUser = await findUserByEmail(normalizedEmail);
    if (!targetUser) return apiError(res, 404, "No user has this email.", "TARGET_USER_NOT_FOUND");
    if (targetUser.id === req.user.id) {
      return apiError(res, 400, "You cannot share a task with yourself.", "SHARE_WITH_SELF");
    }

    const share = await shareTask(taskId, targetUser.id, permission);
    await logActivity(taskId, req.user.id, "shared", { with: normalizedEmail, permission });

    const io = req.app.get("io");
    io?.to(`user:${targetUser.id}`).emit("task:shared", {
      task,
      sharedBy: req.user.id,
      permission,
    });

    // Email notification is best-effort — failure should be logged loudly, not swallowed silently.
    const me = await findUserById(req.user.id);
    sendTaskSharedEmail(normalizedEmail, me?.name || "Someone", task.title).catch((err) => {
      console.warn("[tasks:shareTask] Share email failed", {
        to: normalizedEmail,
        taskId,
        message: err?.message,
      });
    });

    res.json(share);
  } catch (err) {
    logCtl("shareTask", err, { userId: req.user?.id, taskId: req.params.id });
    apiError(res, 500, "Failed to share task.", "TASK_SHARE_FAILED");
  }
};

export const getCollaboratorsHandler = async (req, res) => {
  try {
    const idResult = parseIdParam(req.params.id);
    if (idResult.error) return apiError(res, 400, idResult.error, "INVALID_TASK_ID");

    const collaborators = await getCollaborators(idResult.value);
    res.json(collaborators);
  } catch (err) {
    logCtl("getCollaborators", err, { taskId: req.params.id });
    apiError(res, 500, "Failed to fetch collaborators.", "COLLABORATORS_FETCH_FAILED");
  }
};

export const removeShareHandler = async (req, res) => {
  try {
    const idResult = parseIdParam(req.params.id);
    if (idResult.error) return apiError(res, 400, idResult.error, "INVALID_TASK_ID");
    const userIdResult = parseIdParam(req.params.userId, "userId");
    if (userIdResult.error) return apiError(res, 400, userIdResult.error, "INVALID_USER_ID");

    const task = await findTaskById(idResult.value);
    if (!task || task.user_id !== req.user.id) {
      return apiError(res, 403, "Not authorized to modify collaborators.", "COLLAB_FORBIDDEN");
    }
    await removeShare(idResult.value, userIdResult.value);
    res.json({ message: "Collaborator removed." });
  } catch (err) {
    logCtl("removeShare", err, {
      userId: req.user?.id,
      taskId: req.params.id,
      targetUserId: req.params.userId,
    });
    apiError(res, 500, "Failed to remove collaborator.", "COLLAB_REMOVE_FAILED");
  }
};

export const patchTaskCompleted = patchTask;
