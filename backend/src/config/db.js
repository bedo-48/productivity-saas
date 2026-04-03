import pkg from "pg";
const { Pool } = pkg;

// Sur Render : utilise DATABASE_URL en priorité (Internal ou External URL)
// En local : utilise les variables individuelles DB_USER, DB_HOST, etc.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // requis pour Render PostgreSQL
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT) || 5432,
    });

export default pool;
