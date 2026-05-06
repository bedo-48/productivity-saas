import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onIdTokenChanged,
  signOut,
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
 * Wait for Firebase Auth to finish restoring its persisted session.
 *
 * On a fresh page load, `auth.currentUser` is `null` for ~50–300ms while
 * Firebase reads its IndexedDB cache. If we ask for a token in that
 * window we get the empty string back, the request goes out without an
 * Authorization header, and the backend returns 401 AUTH_HEADER_INVALID
 * even though the user *is* signed in. This helper bridges that gap by
 * subscribing once to onIdTokenChanged and resolving with whatever
 * Firebase decides — capped at 3s so we never hang forever.
 */
let authReadyPromise: Promise<User | null> | null = null;
function ensureAuthSettled(): Promise<User | null> {
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (authReadyPromise) return authReadyPromise;

  authReadyPromise = new Promise((resolve) => {
    let settled = false;
    const finish = (value: User | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      unsubscribe();
      // Allow future calls to wait again if Firebase logs the user out and
      // back in -- otherwise we'd cache a stale "null" forever.
      authReadyPromise = null;
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(auth?.currentUser ?? null), 3000);
    const unsubscribe = onIdTokenChanged(auth!, (user) => finish(user));
  });
  return authReadyPromise;
}

/**
 * Get a Firebase ID token for the currently signed-in user.
 *
 * Pass `forceRefresh = true` to bypass the cache and ask Firebase for a
 * brand-new token -- useful when the backend just rejected the cached one
 * with a `TOKEN_EXPIRED` / `TOKEN_INVALID_OR_EXPIRED` 401 (typically
 * because tokens were revoked server-side, e.g. after a password change).
 */
export async function getFreshIdToken(forceRefresh = false): Promise<string> {
  const current = await ensureAuthSettled();
  if (!current) return "";
  try {
    return await current.getIdToken(forceRefresh);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[firebase] Failed to fetch ID token", err);
    return "";
  }
}

/**
 * Sign the user out of Firebase and bounce them to /login.
 *
 * Called as a last resort by the API layer when even a force-refreshed
 * token is rejected by the backend -- at that point the session really
 * is dead and we have to ask the user to re-authenticate.
 *
 * Safe to call from outside the React tree: uses `window.location` so we
 * don't depend on the router being mounted.
 */
let signOutInFlight = false;
export async function signOutAndRedirect(reason: string = "expired"): Promise<void> {
  if (signOutInFlight) return;
  signOutInFlight = true;
  try {
    if (auth) await signOut(auth);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[firebase] sign-out failed", err);
  }
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    const target = `/login?reason=${encodeURIComponent(reason)}`;
    window.location.assign(target);
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
