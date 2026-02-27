import pool from "../config/db.js";

export const createTask = async (userId, title) => {
  const result = await pool.query(
    `INSERT INTO tasks (user_id, title)
     VALUES ($1, $2)
     RETURNING *`,
    [userId, title]
  );

  return result.rows[0];
};

export const getTasksByUser = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
};
export const deleteTaskById = async (userId, taskId) => {
  const result = await pool.query(
    `DELETE FROM tasks
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [userId, taskId]
  );

  return result.rows[0];
};
