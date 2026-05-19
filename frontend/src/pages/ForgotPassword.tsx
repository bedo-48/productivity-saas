import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import HalfOpenNotebookAuthLayout from "../components/HalfOpenNotebookAuthLayout";
import { auth } from "../services/firebase";
import { useAuth } from "../auth/AuthContext";
import { humanizeFirebaseError } from "../auth/firebaseErrors";

export default function ForgotPassword() {
  const { configured } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) {
      setError("Firebase is not configured. Check VITE_FIREBASE_* env vars.");
      return;
    }
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage(`If an account exists for ${email.trim()}, a reset link is on its way.`);
    } catch (err) {
      setError(humanizeFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <HalfOpenNotebookAuthLayout>
      <p className="auth-kicker">Recover access</p>
      <h1 className="auth-title">Reset your password</h1>
      <p className="auth-copy">
        Enter the email on your account. We'll send a link to set a new password.
      </p>

      {!configured && (
        <p className="auth-warning">
          Firebase isn't configured. Copy <code>frontend/.env.example</code> to{" "}
          <code>frontend/.env</code> and fill in the values.
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

        {error && <p className="auth-error" role="alert">{error}</p>}
        {message && <p className="auth-success">{message}</p>}

        <button
          type="submit"
          disabled={submitting || !configured}
          className="auth-submit"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="auth-link-row center">
        Remembered it?{" "}
        <Link to="/login" className="auth-link">
          Back to sign in
        </Link>
      </p>
    </HalfOpenNotebookAuthLayout>
  );
}
