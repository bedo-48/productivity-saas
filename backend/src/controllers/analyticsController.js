import pool from "../config/db.js";

export const getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE completed = false AND archived = false) AS active_tasks,
        COUNT(*) FILTER (WHERE completed = true) AS completed_tasks,
        COUNT(*) FILTER (
          WHERE completed = true
            AND COALESCE(completed_at, updated_at) > NOW() - INTERVAL '7 days'
        ) AS completed_this_week,
        COUNT(*) FILTER (WHERE completed = false AND archived = false AND created_at < NOW() - INTERVAL '7 days') AS stale_tasks,
        COUNT(*) FILTER (
          WHERE completed = true
            AND completed_at IS NOT NULL
            AND completed_at > NOW() - INTERVAL '30 days'
        ) AS finish_samples_30d,
        AVG(
          GREATEST(
            0,
            EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
          )
        ) FILTER (
          WHERE completed = true
            AND completed_at IS NOT NULL
            AND completed_at > NOW() - INTERVAL '30 days'
            AND completed_at >= created_at
        ) AS avg_completion_hours
       FROM tasks WHERE user_id = $1`,
      [userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get stats" });
  }
};

export const getNeglected = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT t.* FROM tasks t
       LEFT JOIN task_activity_log l
         ON l.task_id = t.id AND l.created_at > NOW() - INTERVAL '3 days'
       WHERE t.user_id = $1
         AND t.completed = false
         AND t.archived = false
         AND t.created_at < NOW() - INTERVAL '7 days'
         AND l.id IS NULL
       ORDER BY t.created_at ASC
       LIMIT 5`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get neglected tasks" });
  }
};

export const getSuggestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT * FROM tasks
       WHERE user_id = $1 AND completed = false AND archived = false
       ORDER BY
         CASE WHEN due_date IS NOT NULL AND due_date < NOW() + INTERVAL '2 days' THEN 1 ELSE 5 END,
         CASE priority WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END,
         created_at ASC
       LIMIT 5`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get suggestions" });
  }
};
