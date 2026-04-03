import pool from "./db.js";

export async function runMigrations() {
  console.log("Running migrations...");
  try {
    await pool.query(`
      -- 1. Update users table
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

      -- 2. Email verification codes
      CREATE TABLE IF NOT EXISTS email_verification_codes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- 3. Update tasks table
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

      -- 4. Task shares
      CREATE TABLE IF NOT EXISTS task_shares (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        shared_with_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission VARCHAR(10) DEFAULT 'view',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(task_id, shared_with_user_id)
      );

      -- 5. Activity log
      CREATE TABLE IF NOT EXISTS task_activity_log (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(30) NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- 6. Notifications
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(30) NOT NULL,
        message TEXT NOT NULL,
        related_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Migrations completed successfully.");
  } catch (err) {
    console.error("Migration error:", err.message);
    // Don't crash the server — log and continue
  }
}
