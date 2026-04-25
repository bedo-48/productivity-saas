/**
 * reset-users-firebase.js
 *
 * ⚠️  DANGER — Supprime TOUS les utilisateurs Firebase Authentication.
 *
 * Prérequis : une des variables d'env suivantes doit être définie
 * (comme déjà documenté dans backend/.env.example) :
 *   - FIREBASE_SERVICE_ACCOUNT    (JSON inline)
 *   - GOOGLE_APPLICATION_CREDENTIALS (chemin absolu vers le JSON)
 *
 * Usage (depuis le dossier backend/) :
 *   node scripts/reset-users-firebase.js          → confirmation interactive
 *   node scripts/reset-users-firebase.js --yes    → exécution directe
 *
 * Remarque : Firebase Admin parcourt les users par lots de 1000 via
 * listUsers(), et deleteUsers() accepte jusqu'à 1000 UIDs par appel.
 */

import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { getFirebaseAuth } from "../src/config/firebaseAdmin.js";

async function confirm(total) {
  if (process.argv.includes("--yes") || process.argv.includes("-y")) return true;
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(
    `⚠️  ${total} utilisateur(s) Firebase vont être SUPPRIMÉS DÉFINITIVEMENT.\n   Tape "DELETE" pour confirmer : `
  );
  rl.close();
  return answer.trim() === "DELETE";
}

async function collectAllUsers(auth) {
  const all = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    all.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return all;
}

async function main() {
  let auth;
  try {
    auth = getFirebaseAuth();
  } catch (err) {
    console.error("❌ Firebase Admin n'est pas configuré :", err.message);
    console.error("   Renseigne FIREBASE_SERVICE_ACCOUNT ou GOOGLE_APPLICATION_CREDENTIALS dans backend/.env");
    process.exit(1);
  }

  console.log("→ Récupération de la liste des utilisateurs Firebase ...");
  const users = await collectAllUsers(auth);
  console.log(`   ${users.length} utilisateur(s) trouvé(s).`);

  if (users.length === 0) {
    console.log("✅ Rien à supprimer.");
    return;
  }

  users.forEach((u, i) => {
    const email = u.email || "(no email)";
    const verified = u.emailVerified ? "✓" : "·";
    console.log(`   ${String(i + 1).padStart(3)}. ${email.padEnd(40)} ${verified}  ${u.uid}`);
  });
  console.log();

  const ok = await confirm(users.length);
  if (!ok) {
    console.log("❌ Annulé. Aucun compte Firebase n'a été supprimé.");
    return;
  }

  // deleteUsers limite à 1000 UIDs par appel.
  const BATCH = 1000;
  let totalDeleted = 0;
  for (let i = 0; i < users.length; i += BATCH) {
    const slice = users.slice(i, i + BATCH).map((u) => u.uid);
    const result = await auth.deleteUsers(slice);
    totalDeleted += result.successCount;
    if (result.failureCount > 0) {
      console.warn(`   ⚠️  ${result.failureCount} échec(s) dans ce lot :`);
      result.errors.forEach((e) => console.warn(`      - ${slice[e.index]} → ${e.error.message}`));
    }
  }

  console.log(`\n✅ ${totalDeleted}/${users.length} utilisateur(s) Firebase supprimé(s).`);
}

main().catch((err) => {
  console.error("❌ Erreur inattendue :", err);
  process.exit(1);
});
