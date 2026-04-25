import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import ClosedNotebookAuthLayout from "../components/ClosedNotebookAuthLayout";
import { useAuth } from "../auth/AuthContext";
import { auth } from "../services/firebase";
import { humanizeFirebaseError } from "../auth/firebaseErrors";

export default function Register() {
  const navigate = useNavigate();
  const { user, initializing, configured } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initializing && user) navigate("/dashboard", { replace: true });
  }, [initializing, user, navigate]);

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) {
      setError("Firebase is not configured. Check VITE_FIREBASE_* env vars.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      // Fire a verification email but don't block the flow on it.
      sendEmailVerification(cred.user).catch(() => {});
      // onIdTokenChanged will pick up the new session.
    } catch (err) {
      setError(humanizeFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ClosedNotebookAuthLayout>
      <h1 className="auth-title">Create your notebook</h1>
      <p className="auth-copy">Start tracking tasks in under a minute.</p>

      {!configured && (
        <p className="auth-warning">
          Firebase isn't configured. Copy <code>frontend/.env.example</code> to{" "}
          <code>frontend/.env</code> and fill in the values.
        </p>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <label className="auth-field">
          <span className="auth-label">Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoComplete="name"
            disabled={submitting}
            className="auth-input"
          />
        </label>

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
            autoComplete="new-password"
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
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="auth-link-row center">
        Already have one?{" "}
        <Link to="/login" className="auth-link">
          Sign in
        </Link>
      </p>
    </ClosedNotebookAuthLayout>
  );
}
