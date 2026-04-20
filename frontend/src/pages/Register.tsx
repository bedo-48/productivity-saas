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
      <h1 style={titleStyle}>Create your notebook</h1>
      <p style={copyStyle}>Start tracking tasks in under a minute.</p>

      {!configured && (
        <p style={warningStyle}>
          Firebase isn't configured. Copy <code>frontend/.env.example</code> to <code>frontend/.env</code> and fill in the values.
        </p>
      )}

      <form onSubmit={handleSubmit} style={formStyle}>
        <label style={fieldStyle}>
          <span style={labelStyle}>Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoComplete="name"
            style={inputStyle}
          />
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
          />
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            style={inputStyle}
          />
        </label>

        {error && <p style={errorStyle}>{error}</p>}

        <button type="submit" disabled={submitting || !configured} style={submitStyle}>
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>

      <p style={linkRowStyle}>
        Already have one? <Link to="/login" style={linkStyle}>Sign in</Link>
      </p>
    </ClosedNotebookAuthLayout>
  );
}

const titleStyle: React.CSSProperties = { fontFamily: "Newsreader, serif", fontSize: "1.9rem", marginBottom: 4, color: "#3e342d" };
const copyStyle: React.CSSProperties = { marginBottom: 20, color: "#6f5b4f" };
const formStyle: React.CSSProperties = { display: "grid", gap: 14, width: "100%" };
const fieldStyle: React.CSSProperties = { display: "grid", gap: 6 };
const labelStyle: React.CSSProperties = { fontSize: ".78rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#7c675a" };
const inputStyle: React.CSSProperties = { border: "1px solid rgba(107,82,66,.18)", background: "rgba(255,251,244,.86)", color: "#4d3b31", borderRadius: 12, padding: "12px 14px", font: "inherit" };
const submitStyle: React.CSSProperties = { border: 0, borderRadius: 14, background: "linear-gradient(135deg,#d08f58,#c5655d)", color: "#fffaf4", padding: "12px 16px", cursor: "pointer", marginTop: 8, font: "inherit" };
const errorStyle: React.CSSProperties = { background: "rgba(197,101,93,.12)", color: "#8f3d36", padding: "10px 12px", borderRadius: 10, fontSize: ".92rem" };
const warningStyle: React.CSSProperties = { background: "rgba(232,203,151,.28)", color: "#7c5a2a", padding: "10px 12px", borderRadius: 10, fontSize: ".88rem", marginBottom: 12 };
const linkRowStyle: React.CSSProperties = { marginTop: 18, color: "#6f5b4f" };
const linkStyle: React.CSSProperties = { color: "#8b4b3e", textDecoration: "none", fontWeight: 600 };
