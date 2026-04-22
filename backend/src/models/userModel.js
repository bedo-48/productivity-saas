import pool from "../config/db.js";

const PUBLIC_COLUMNS = `id, name, email, email_verified, avatar_url, firebase_uid, created_at`;

export const createUser = async (name, email, password) => {
  const result = await pool.query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     RETURNING ${PUBLIC_COLUMNS}`,
    [name, email, password]
  );
  return result.rows[0];
};

export const findUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0];
};

export const findUserById = async (id) => {
  const result = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0];
};

export const findUserByFirebaseUid = async (firebaseUid) => {
  const result = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE firebase_uid = $1`,
    [firebaseUid]
  );
  return result.rows[0];
};

export const markEmailVerified = async (userId) => {
  await pool.query(
    `UPDATE users SET email_verified = true WHERE id = $1`,
    [userId]
  );
};

/**
 * Find the user row that corresponds to a Firebase-authenticated user,
 * or create one if this is their first request. Also reconciles the
 * firebase_uid on an existing row that was created under the old JWT flow
 * (matched by email).
 *
 * @param {{ uid: string, email: string, name?: string, emailVerified?: boolean, picture?: string }} profile
 * @returns {Promise<object>} the stored user row (with local numeric id)
 */
export const upsertUserFromFirebase = async (profile) => {
  const { uid, email, name, emailVerified, picture } = profile;
  if (!uid) throw new Error("Firebase UID is required.");
  if (!email) throw new Error("Firebase token is missing an email claim.");

  // 1. Already linked by UID → return and sync verified flag if it changed.
  const byUid = await findUserByFirebaseUid(uid);
  if (byUid) {
    if (emailVerified && !byUid.email_verified) {
      await markEmailVerified(byUid.id);
      byUid.email_verified = true;
    }
    return byUid;
  }

  // 2. Legacy row with same email → attach firebase_uid to it.
  const byEmail = await findUserByEmail(email);
  if (byEmail) {
    const result = await pool.query(
      `UPDATE users
         SET firebase_uid = $1,
             email_verified = email_verified OR $2,
             avatar_url = COALESCE(avatar_url, $3)
       WHERE id = $4
       RETURNING ${PUBLIC_COLUMNS}`,
      [uid, Boolean(emailVerified), picture || null, byEmail.id]
    );
    return result.rows[0];
  }

  // 3. Brand-new Firebase user → create a row with no local password.
  const displayName = (name && name.trim()) || email.split("@")[0] || "User";
  const result = await pool.query(
    `INSERT INTO users (name, email, firebase_uid, email_verified, avatar_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PUBLIC_COLUMNS}`,
    [displayName, email, uid, Boolean(emailVerified), picture || null]
  );
  return result.rows[0];
};
