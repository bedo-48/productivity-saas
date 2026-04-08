import pool from "../config/db.js";

export const createCode = async (userId, code, type = "verification") => {
  await pool.query(
    `UPDATE email_verification_codes
     SET used = true
     WHERE user_id = $1 AND used = false AND type = $2`,
    [userId, type]
  );

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const result = await pool.query(
    `INSERT INTO email_verification_codes (user_id, code, expires_at, type)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, code, expiresAt, type]
  );

  return result.rows[0];
};

export const findCodeRecord = async (userId, code, type = "verification") => {
  const result = await pool.query(
    `SELECT * FROM email_verification_codes
     WHERE user_id = $1 AND code = $2 AND type = $3
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, code, type]
  );

  return result.rows[0];
};

export const findCodeByValue = async (code, type = "verification") => {
  const result = await pool.query(
    `SELECT * FROM email_verification_codes
     WHERE code = $1 AND type = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [code, type]
  );

  return result.rows[0];
};

export const findLatestCode = async (userId, type = "verification") => {
  const result = await pool.query(
    `SELECT * FROM email_verification_codes
     WHERE user_id = $1 AND type = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, type]
  );

  return result.rows[0];
};

export const markCodeUsed = async (codeId) => {
  await pool.query(
    `UPDATE email_verification_codes SET used = true WHERE id = $1`,
    [codeId]
  );
};
