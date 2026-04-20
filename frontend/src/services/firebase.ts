import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onIdTokenChanged,
  type Auth,
  type User,
} from "firebase/auth";

type FirebaseEnv = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

function read(name: string): string | undefined {
  const value = import.meta.env[name as keyof ImportMetaEnv] as string | undefined;
  return value?.trim() || undefined;
}

function buildConfig(): FirebaseEnv | null {
  const apiKey = read("VITE_FIREBASE_API_KEY");
  const authDomain = read("VITE_FIREBASE_AUTH_DOMAIN");
  const projectId = read("VITE_FIREBASE_PROJECT_ID");
  const storageBucket = read("VITE_FIREBASE_STORAGE_BUCKET");
  const messagingSenderId = read("VITE_FIREBASE_MESSAGING_SENDER_ID");
  const appId = read("VITE_FIREBASE_APP_ID");

  if (!apiKey || !authDomain || !projectId || !appId) return null;

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: storageBucket ?? "",
    messagingSenderId: messagingSenderId ?? "",
    appId,
    measurementId: read("VITE_FIREBASE_MEASUREMENT_ID"),
  };
}

const config = buildConfig();

if (!config && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    "[firebase] Missing VITE_FIREBASE_* env vars — auth will not work. " +
      "See frontend/.env.example."
  );
}

export const firebaseApp: FirebaseApp | null = config ? initializeApp(config) : null;
export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;

export function isFirebaseConfigured(): boolean {
  return auth !== null;
}

/**
 * Get a fresh Firebase ID token for the currently signed-in user.
 * Forces a refresh if the token is within 5 minutes of expiry so that
 * long-running tabs don't hit 401s.
 */
export async function getFreshIdToken(): Promise<string> {
  const current = auth?.currentUser;
  if (!current) return "";
  try {
    return await current.getIdToken(/* forceRefresh */ false);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[firebase] Failed to fetch ID token", err);
    return "";
  }
}

export function subscribeToIdToken(listener: (user: User | null) => void): () => void {
  if (!auth) {
    listener(null);
    return () => undefined;
  }
  return onIdTokenChanged(auth, listener);
}

export type { User };
