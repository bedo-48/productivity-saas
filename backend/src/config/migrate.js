import pkg from "pg";
const { Client } = pkg;

function getClientConfig() {
  const dbUrl = process.env.DATABASE_URL || "";
  const needsSSL = dbUrl.includes(".render.com") || dbUrl.includes("amazonaws");
  return dbUrl
    ? { connectionString: dbUrl, ssl: needsSSL ? { rejectUnauthorized: false } : false }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT) || 5432,
      };
}

async function attempt() {
  const client = new Client(getClientConfig());
  await client.connect();

  // Run each statement separately — more reliable than multi-statement queries
  const statements = [
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

  for (const sql of statements) {
    await client.query(sql);
  }

  await client.end();
}

export async function runMigrations() {
  const maxAttempts = 5;
  const delayMs = 4000;

  for (let i = 1; i <= maxAttempts; i++) {
    try {
      console.log(`Migration attempt ${i}/${maxAttempts}...`);
      await attempt();
      console.log("Migrations completed successfully.");
      return;
    } catch (err) {
      console.error(`Migration attempt ${i} failed: ${err.message}`);
      if (i < maxAttempts) {
        console.log(`Retrying in ${delayMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        console.error("All migration attempts failed. Server will start without migrations.");
      }
    }
  }
}
