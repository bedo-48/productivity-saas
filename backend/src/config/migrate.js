import pool from "./db.js";

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT false,
    archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMP,
    priority VARCHAR(10) DEFAULT 'medium',
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`,
  `CREATE TABLE IF NOT EXISTS email_verification_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium'`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMP`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
  `CREATE TABLE IF NOT EXISTS task_shares (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    shared_with_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(10) DEFAULT 'view',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(task_id, shared_with_user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS task_activity_log (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(30) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    related_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
];

export async function runMigrations() {
  const maxAttempts = 5;

  for (let i = 1; i <= maxAttempts; i++) {
    let client;
    try {
      console.log(`Migration attempt ${i}/${maxAttempts}...`);
      client = await pool.connect();

      for (const sql of statements) {
        await client.query(sql);
      }

      console.log("Migrations completed successfully.");
      return;
    } catch (err) {
      console.error(`Migration attempt ${i} failed: ${err.message}`);
      if (i < maxAttempts) {
        console.log(`Retrying in 4s...`);
        await new Promise((r) => setTimeout(r, 4000));
      } else {
        console.error("All migration attempts failed.");
      }
    } finally {
      if (client) client.release();
    }
  }
}
