import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";

/**
 * Initialize the Firebase Admin SDK exactly once.
 *
 * Credentials are resolved in this order:
 *   1. FIREBASE_SERVICE_ACCOUNT   → raw JSON string (Render / Vercel / Docker)
 *   2. GOOGLE_APPLICATION_CREDENTIALS → absolute path to a JSON file (local dev)
 *   3. Default credentials        → works on GCP / Cloud Run without extra setup
 *
 * FIREBASE_PROJECT_ID is honoured as a fallback projectId when present.
 */
function buildCredential() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inline) {
    try {
      const parsed = JSON.parse(inline);
      return admin.credential.cert(parsed);
    } catch (err) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT is set but is not valid JSON: ${err.message}`
      );
    }
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    const absolute = path.isAbsolute(credPath)
      ? credPath
      : path.resolve(process.cwd(), credPath);
    if (!fs.existsSync(absolute)) {
      throw new Error(
        `GOOGLE_APPLICATION_CREDENTIALS points to "${absolute}" but the file does not exist.`
      );
    }
    const parsed = JSON.parse(fs.readFileSync(absolute, "utf8"));
    return admin.credential.cert(parsed);
  }

  // Fall back to ADC (e.g. GCP metadata server, gcloud auth application-default login)
  return admin.credential.applicationDefault();
}

let cachedApp = null;

export function getFirebaseAdmin() {
  if (cachedApp) return cachedApp;
  if (admin.apps.length > 0) {
    cachedApp = admin.app();
    return cachedApp;
  }

  const options = { credential: buildCredential() };
  if (process.env.FIREBASE_PROJECT_ID) {
    options.projectId = process.env.FIREBASE_PROJECT_ID;
  }

  cachedApp = admin.initializeApp(options);
  return cachedApp;
}

export function getFirebaseAuth() {
  return getFirebaseAdmin().auth();
}

export default getFirebaseAdmin;
