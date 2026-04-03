import pkg from "pg";
const { Pool } = pkg;

// Internal Render URLs (dpg-xxx-a) don't need SSL
// External Render URLs (dpg-xxx-a.region-postgres.render.com) need SSL
const dbUrl = process.env.DATABASE_URL || "";
const needsSSL = dbUrl.includes(".render.com") || dbUrl.includes("amazonaws");

const pool = dbUrl
  ? new Pool({
      connectionString: dbUrl,
      ssl: needsSSL ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT) || 5432,
    });

pool.on("error", (err) => {
  console.error("DB pool error:", err.message);
});

export default pool;
