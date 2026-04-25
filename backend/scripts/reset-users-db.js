/**
 * reset-users-db.js
 *
 * ⚠️  DANGER — Wipes every account-related row from PostgreSQL.
 *
 * Usage (depuis le dossier backend/) :
 *   node scripts/reset-users-db.js            → demande confirmation interactive
 *   node scripts/reset-users-db.js --yes      → exécute sans confirmation
 *
 * Ce script fait un TRUNCATE ... RESTART IDENTITY CASCADE sur :
 *   users, tasks, email_verification_codes, task_shares,
 *   task_activity_log, notifications
 *
 * Après exécution, toutes les séquences d'ID repartent à 1.
 * Ne touche PAS à Firebase Authentication (voir reset-users-firebase.js).
 */

import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import pkg from "pg";

const { Pool } = pkg;

const TABLES = [
  "notifications",
  "task_activity_log",
  "task_shares",
  "email_verification_codes",
  "tasks",
  "users",
];

function buildPool() {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    return new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });
  }
  return new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 5432,
  });
}

async function confirm() {
  if (process.argv.includes("--yes") || process.argv.includes("-y")) return true;
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(
    "⚠️  Cela va supprimer DÉFINITIVEMENT tous les users, tasks, codes et notifications.\n   Tape \"DELETE\" pour confirmer : "
  );
  rl.close();
  return answer.trim() === "DELETE";
}

async function main() {
  const pool = buildPool();
  console.log(
    `→ Connexion à ${process.env.DB_NAME || process.env.DATABASE_URL || "(DB non configurée)"} sur ${process.env.DB_HOST || "?"}`
  );

  // 1. Afficher un aperçu avant destruction.
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT id, email, created_at FROM users ORDER BY id`);
    console.log(`\nUtilisateurs actuellement en base (${rows.length}) :`);
    if (rows.length === 0) {
      console.log("  (aucun)");
    } else {
      rows.forEach((u) => console.log(`  #${u.id}  ${u.email}  (créé ${u.created_at.toISOString?.() || u.created_at})`));
    }
    console.log();

    const ok = await confirm();
    if (!ok) {
      console.log("❌ Annulé. Aucune donnée n'a été modifiée.");
      return;
    }

    // 2. TRUNCATE avec RESTART IDENTITY + CASCADE — une seule commande, une seule transaction.
    console.log("\n→ Exécution du TRUNCATE ... RESTART IDENTITY CASCADE ...");
    await client.query("BEGIN");
    await client.query(`TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
    await client.query("COMMIT");
    console.log("✅ Tables vidées, séquences d'ID remises à 1.");

    // 3. Recomptage pour validation.
    const counts = {};
    for (const t of TABLES) {
      const r = await client.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
      counts[t] = r.rows[0].n;
    }
    console.log("\nVérification finale :");
    for (const [t, n] of Object.entries(counts)) {
      console.log(`  ${t.padEnd(28)} ${n}`);
    }
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Erreur pendant la purge :", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
