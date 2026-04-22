import pool from "../config/db.js";

export const createTask = async (userId, title, description = null, priority = "medium", dueDate = null) => {
  const result = await pool.query(
    `INSERT INTO tasks (user_id, title, description, priority, due_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, title, description, priority, dueDate]
  );
  return result.rows[0];
};

export const getActiveTasks = async (userId) => {
  const result = await pool.query(
    `SELECT t.*,
            COALESCE(
              json_agg(
                json_build_object('id', u.id, 'name', u.name, 'permission', ts.permission)
              ) FILTER (WHERE ts.id IS NOT NULL),
              '[]'
            ) AS collaborators
     FROM tasks t
     LEFT JOIN task_shares ts ON ts.task_id = t.id
     LEFT JOIN users u ON u.id = ts.shared_with_user_id
     WHERE t.user_id = $1 AND t.archived = false
     GROUP BY t.id
     ORDER BY
       CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
       t.created_at DESC`,
    [userId]
  );
  return result.rows;
};

export const getArchivedTasks = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM tasks
     WHERE user_id = $1 AND archived = true
     ORDER BY archived_at DESC`,
    [userId]
  );
  return result.rows;
};

export const getSharedTasks = async (userId) => {
  const result = await pool.query(
    `SELECT t.*, ts.permission, u.name AS owner_name, u.email AS owner_email
     FROM task_shares ts
     JOIN tasks t ON t.id = ts.task_id
     JOIN users u ON u.id = t.user_id
     WHERE ts.shared_with_user_id = $1 AND t.archived = false
     ORDER BY ts.created_at DESC`,
    [userId]
  );
  return result.rows;
};

export const getRecentActivity = async (userId) => {
  const result = await pool.query(
    `SELECT l.id,
            l.task_id,
            l.action,
            l.details,
            l.created_at,
            t.title AS task_title,
            u.name AS actor_name
     FROM task_activity_log l
     JOIN tasks t ON t.id = l.task_id
     JOIN users u ON u.id = l.user_id
     LEFT JOIN task_shares ts ON ts.task_id = t.id AND ts.shared_with_user_id = $1
     WHERE t.user_id = $1 OR ts.shared_with_user_id = $1
     ORDER BY l.created_at DESC
     LIMIT 30`,
    [userId]
  );
  return result.rows;
};

export const findTaskById = async (taskId) => {
  const result = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [taskId]);
  return result.rows[0];
};

export const updateTaskCompleted = async (userId, taskId, completed) => {
  const result = await pool.query(
    `UPDATE tasks SET
       completed = $1,
       updated_at = NOW(),
       completed_at = CASE WHEN $1 = true THEN NOW() ELSE NULL END
     WHERE id = $2 AND (user_id = $3 OR EXISTS (
       SELECT 1 FROM task_shares
       WHERE task_id = $2 AND shared_with_user_id = $3 AND permission = 'edit'
     ))
     RETURNING *`,
    [completed, taskId, userId]
  );
  return result.rows[0];
};

export const updateTask = async (userId, taskId, fields) => {
  const { title, description, priority, due_date } = fields;
  const result = await pool.query(
    `UPDATE tasks
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         priority = COALESCE($3, priority),
         due_date = $4,
         updated_at = NOW()
     WHERE id = $5 AND user_id = $6
     RETURNING *`,
    [title, description, priority, due_date, taskId, userId]
  );
  return result.rows[0];
};

export const archiveTask = async (userId, taskId) => {
  const result = await pool.query(
    `UPDATE tasks SET archived = true, archived_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [taskId, userId]
  );
  return result.rows[0];
};

export const restoreTask = async (userId, taskId) => {
  const result = await pool.query(
    `UPDATE tasks SET archived = false, archived_at = NULL, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [taskId, userId]
  );
  return result.rows[0];
};

export const deleteTaskById = async (userId, taskId) => {
  const result = await pool.query(
    `DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *`,
    [taskId, userId]
  );
  return result.rows[0];
};

export const toggleTaskCompleted = async (userId, taskId) => {
  const result = await pool.query(
    `UPDATE tasks SET
       completed = NOT completed,
       updated_at = NOW(),
       completed_at = CASE WHEN completed = false THEN NOW() ELSE NULL END
     WHERE user_id = $1 AND id = $2 RETURNING *`,
    [userId, taskId]
  );
  return result.rows[0];
};

export const shareTask = async (taskId, sharedWithUserId, permission = "view") => {
  const result = await pool.query(
    `INSERT INTO task_shares (task_id, shared_with_user_id, permission)
     VALUES ($1, $2, $3)
     ON CONFLICT (task_id, shared_with_user_id)
     DO UPDATE SET permission = $3
     RETURNING *`,
    [taskId, sharedWithUserId, permission]
  );
  return result.rows[0];
};

export const removeShare = async (taskId, userId) => {
  await pool.query(
    `DELETE FROM task_shares WHERE task_id = $1 AND shared_with_user_id = $2`,
    [taskId, userId]
  );
};

export const getCollaborators = async (taskId) => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, ts.permission
     FROM task_shares ts
     JOIN users u ON u.id = ts.shared_with_user_id
     WHERE ts.task_id = $1`,
    [taskId]
  );
  return result.rows;
};

export const logActivity = async (taskId, userId, action, details = null) => {
  await pool.query(
    `INSERT INTO task_activity_log (task_id, user_id, action, details)
     VALUES ($1, $2, $3, $4)`,
    [taskId, userId, action, details ? JSON.stringify(details) : null]
  );
};
