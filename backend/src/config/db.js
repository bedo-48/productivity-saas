import pkg from "pg";
const { Pool } = pkg;

const dbUrl = process.env.DATABASE_URL || "";

// Diagnostic log — masked password
if (dbUrl) {
  const masked = dbUrl.replace(/:([^:@]{1,})@/, ":***@");
  console.log("DB connecting to:", masked);
} else {
  console.log("DATABASE_URL not set — using individual env vars");
  console.log("DB_HOST:", process.env.DB_HOST || "NOT SET");
}

const needsSSL = dbUrl.includes(".render.com") || dbUrl.includes("amazonaws");

const pool = dbUrl
  ? new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
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
