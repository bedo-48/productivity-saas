import { createTask, getTasksByUser, deleteTaskById, toggleTaskCompleted } from "../models/taskModel.js";
import { updateTaskCompleted } from "../models/taskModel.js";

export const addTask = async (req, res) => {
  try {
    const { title } = req.body;

    const task = await createTask(req.user.id, title);

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create task" });
  }
};

export const getMyTasks = async (req, res) => {
  try {
    const tasks = await getTasksByUser(req.user.id);
    res.json(tasks);
  } catch (err) {
    console.error("gettMyTasks error: ",err);
    return res.status(500).json({ error: err.message });
  }

};

export const deleteTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = Number(req.params.id);

    const deleted = await deleteTaskById(userId, taskId);

    if (!deleted) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

export const patchTaskCompleted = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = Number(req.params.id);
    const { completed } = req.body;

    const updated = await updateTaskCompleted(userId, taskId, completed);

    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("PATCH ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};
