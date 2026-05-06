import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import ClosedNotebookAuthLayout from "../components/ClosedNotebookAuthLayout";
import { useAuth } from "../auth/AuthContext";
import { auth } from "../services/firebase";
import { humanizeFirebaseError } from "../auth/firebaseErrors";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, initializing, configured } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  // Surface a friendly notice when we landed here because the API rejected
  // our token (e.g. revoked after a password change). See signOutAndRedirect
  // in services/firebase.ts.
  const expired = new URLSearchParams(location.search).get("reason") === "expired";

  // If we land here already signed in, bounce to the dashboard.
  useEffect(() => {
    if (!initializing && user) navigate(from, { replace: true });
  }, [initializing, user, from, navigate]);

  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) {
      setError("Firebase is not configured. Check VITE_FIREBASE_* env vars.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // onIdTokenChanged in AuthContext will flip `user` and the effect above redirects.
    } catch (err) {
      setError(humanizeFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ClosedNotebookAuthLayout>
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-copy">Sign in to get back to your notebook.</p>

      {!configured && (
        <p className="auth-warning">
          Firebase isn't configured. Copy <code>frontend/.env.example</code> to{" "}
          <code>frontend/.env</code> and fill in the values.
        </p>
      )}

      {expired && configured && (
        <p className="auth-warning" role="status">
          Your session has expired. Please sign in again.
        </p>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <label className="auth-field">
          <span className="auth-label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            disabled={submitting}
            className="auth-input"
          />
        </label>

        <label className="auth-field">
          <span className="auth-label">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="current-password"
            disabled={submitting}
            className="auth-input"
          />
        </label>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !configured}
          className="auth-submit"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="auth-link-row">
        <Link to="/forgot-password" className="auth-link">
          Forgot password?
        </Link>
        <Link to="/register" className="auth-link">
          Create account
        </Link>
      </div>
    </ClosedNotebookAuthLayout>
  );
}
