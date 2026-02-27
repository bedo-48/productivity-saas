import { createTask, getTasksByUser, deleteTaskById } from "../models/taskModel.js";

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
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }

};

export const deleteTask = async (req, res) => {
  try {
    const taskId = Number(req.params.id);

    const deleted = await deleteTaskById(req.user.id, taskId);

    if (!deleted) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task deleted" });
  } catch (err) {
  console.error("DELETE /tasks/:id error:", err);
  return res.status(500).json({
    error: "Failed to delete task",
    details: err?.message || String(err),
  });
}
};
