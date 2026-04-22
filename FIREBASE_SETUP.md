# Firebase Auth setup

The frontend auth flow (login / register / forgot password) now runs on
Firebase Authentication instead of the backend's JWT + email-code system.
To make it actually work you need to point the app at a Firebase project.

This is a one-time setup that takes about 5 minutes.

## 1. Create a Firebase project

1. Go to https://console.firebase.google.com/ and click **Add project**.
2. Name it anything (e.g. `productivity-saas-demo`). Google Analytics is
   optional — turn it off for a demo.
3. When the project is ready, click it to open the dashboard.

## 2. Enable Email/Password sign-in

1. In the left sidebar, click **Build → Authentication**.
2. Click **Get started**.
3. Under the **Sign-in method** tab, click **Email/Password**.
4. Toggle **Enable** on. Leave "Email link (passwordless sign-in)" off.
5. Click **Save**.

## 3. Register a web app and copy the config

1. Back on the project dashboard, click the **`</>`** (web) icon under
   "Get started by adding Firebase to your app."
2. Nickname it (e.g. `web`). Don't check "Firebase Hosting" unless you
   plan to use it. Click **Register app**.
3. Firebase shows a snippet with a `firebaseConfig = { ... }` object.
   Copy the values — you'll paste them in the next step.

## 4. Paste the config into `frontend/.env.local`

Create a file at `frontend/.env.local` (next to `package.json`) with:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Fill in the values from the console. Keep this file out of git — add
`.env.local` to `.gitignore` if it isn't already.

## 5. Install the Firebase SDK

```
cd frontend
npm install
```

(The `firebase` dependency was added to `package.json` as part of this
change, so `npm install` pulls it in.)

## 6. Run the app

```
npm run dev
```

Visit the login page, click **Create account**, pick any email + password
(>= 6 chars), and you should land on the dashboard without needing a
verification code.

---

## One thing still to do on the backend

The frontend is now sending Firebase **ID tokens** in the `Authorization`
header for every `/tasks` / `/analytics` call. The backend's current
`authMiddleware.js` expects the old JWT format signed by the backend's
own secret, so those API calls will fail with **401 Unauthorized** until
the middleware is updated to verify Firebase ID tokens.

The minimal change is to:

1. `npm install firebase-admin` in `backend/`.
2. Replace `backend/src/middleware/authMiddleware.js` so it verifies the
   incoming token with `admin.auth().verifyIdToken(token)` and looks up
   (or creates) a user row by the Firebase UID.
3. Download a service account JSON from the Firebase console
   (**Project settings → Service accounts → Generate new private key**)
   and wire it into the Admin SDK init.

Let me know when you want to do the backend half and I'll write the
middleware + the user upsert helper.

## Troubleshooting

- **`auth/operation-not-allowed`** at sign-up → you skipped step 2.
  Enable Email/Password in the Firebase console.
- **`auth/api-key-not-valid`** → the value in `.env.local` doesn't match
  the web app you registered. Re-copy from **Project settings → General
  → Your apps**.
- **Blank page / console error about `VITE_FIREBASE_*`** → `.env.local`
  is missing or Vite wasn't restarted after you created it. Stop `npm
  run dev` and start it again.
- **Login works but dashboard shows no tasks** → that's the backend
  middleware issue described above.
