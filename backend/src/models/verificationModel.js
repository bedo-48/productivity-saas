import pool from "../config/db.js";

export const createCode = async (userId, code) => {
  // Expire old codes first
  await pool.query(
    `UPDATE email_verification_codes SET used = true WHERE user_id = $1 AND used = false`,
    [userId]
  );
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  const result = await pool.query(
    `INSERT INTO email_verification_codes (user_id, code, expires_at)
     VALUES ($1, $2, $3) RETURNING *`,
    [userId, code, expiresAt]
  );
  return result.rows[0];
};

export const findValidCode = async (userId, code) => {
  const result = await pool.query(
    `SELECT * FROM email_verification_codes
     WHERE user_id = $1 AND code = $2 AND used = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId, code]
  );
  return result.rows[0];
};

export const markCodeUsed = async (codeId) => {
  await pool.query(
    `UPDATE email_verification_codes SET used = true WHERE id = $1`,
    [codeId]
  );
};
