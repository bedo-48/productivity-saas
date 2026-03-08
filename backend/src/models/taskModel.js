// backend/src/models/taskModel.js
// Rôle: Toutes les fonctions qui parlent DIRECTEMENT à la base de données (PostgreSQL).
// Ici on ne gère pas req/res (ça c'est le controller). Ici on fait juste des requêtes SQL.

import pool from "../config/db.js";

/**
 * CREATE: crée une nouvelle tâche pour un utilisateur.
 * @param {number} userId - id de l'utilisateur (vient du token JWT)
 * @param {string} title - titre de la task
 * @returns {Promise<object>} la task créée (row)
 */
export const createTask = async (userId, title) => {
  const result = await pool.query(
    `
    INSERT INTO tasks (user_id, title)
    VALUES ($1, $2)
    RETURNING *
    `,
    [userId, title]
  );

  return result.rows[0]; // une seule task créée
};

/**
 * READ: récupère toutes les tasks d'un utilisateur.
 * @param {number} userId
 * @returns {Promise<object[]>} liste de tasks
 */
export const getTasksByUser = async (userId) => {
  const result = await pool.query(
    `
    SELECT *
    FROM tasks
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );

  return result.rows;
};

/**
 * DELETE: supprime une task en s'assurant qu'elle appartient à l'utilisateur.
 * @param {number} userId
 * @param {number} taskId
 * @returns {Promise<object|undefined>} la task supprimée, ou undefined si introuvable
 */
export const deleteTaskById = async (userId, taskId) => {
  const result = await pool.query(
    `
    DELETE FROM tasks
    WHERE id = $1 AND user_id = $2
    RETURNING *
    `,
    [taskId, userId]
  );

  return result.rows[0];
};

/**
 * UPDATE: met à jour le champ "completed" (true/false).
 * Le frontend envoie completed: true ou false.
 * @param {number} userId
 * @param {number} taskId
 * @param {boolean} completed
 * @returns {Promise<object|undefined>} task mise à jour, ou undefined si introuvable
 */
export const updateTaskCompleted = async (userId, taskId, completed) => {
  const result = await pool.query(
    `
    UPDATE tasks
    SET completed = $1
    WHERE id = $2 AND user_id = $3
    RETURNING *
    `,
    [completed, taskId, userId]
  );

  return result.rows[0];
};

/**
 * TOGGLE (optionnel): inverse completed automatiquement (true -> false / false -> true).
 * Utile si tu veux une route PATCH /tasks/:id/toggle sans body.
 * @param {number} userId
 * @param {number} taskId
 * @returns {Promise<object|undefined>}
 */
export const toggleTaskCompleted = async (userId, taskId) => {
  const result = await pool.query(
    `
    UPDATE tasks
    SET completed = NOT completed
    WHERE user_id = $1 AND id = $2
    RETURNING *
    `,
    [userId, taskId]
  );

  return result.rows[0];
};