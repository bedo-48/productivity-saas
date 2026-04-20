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
      <h1 style={labelTitleStyle}>Welcome back</h1>
      <p style={labelCopyStyle}>Sign in to get back to your notebook.</p>

      {!configured && (
        <p style={warningStyle}>
          Firebase isn't configured. Copy <code>frontend/.env.example</code> to <code>frontend/.env</code> and fill in the values.
        </p>
      )}

      <form onSubmit={handleSubmit} style={formStyle}>
        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>Email</span>
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
          <span style={fieldLabelStyle}>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="current-password"
            style={inputStyle}
          />
        </label>

        {error && <p style={errorStyle}>{error}</p>}

        <button type="submit" disabled={submitting || !configured} style={submitStyle}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div style={linkRowStyle}>
        <Link to="/forgot-password" style={linkStyle}>Forgot password?</Link>
        <Link to="/register" style={linkStyle}>Create account</Link>
      </div>
    </ClosedNotebookAuthLayout>
  );
}

// ─── inline styles tuned to match ClosedNotebookAuthLayout ───
const labelTitleStyle: React.CSSProperties = {
  fontFamily: "Newsreader, serif",
  fontSize: "1.9rem",
  marginBottom: 4,
  color: "#3e342d",
};
const labelCopyStyle: React.CSSProperties = { marginBottom: 20, color: "#6f5b4f" };
const formStyle: React.CSSProperties = { display: "grid", gap: 14, width: "100%" };
const fieldStyle: React.CSSProperties = { display: "grid", gap: 6 };
const fieldLabelStyle: React.CSSProperties = {
  fontSize: ".78rem",
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "#7c675a",
};
const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(107,82,66,.18)",
  background: "rgba(255,251,244,.86)",
  color: "#4d3b31",
  borderRadius: 12,
  padding: "12px 14px",
  font: "inherit",
};
const submitStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 14,
  background: "linear-gradient(135deg,#d08f58,#c5655d)",
  color: "#fffaf4",
  padding: "12px 16px",
  cursor: "pointer",
  marginTop: 8,
  font: "inherit",
};
const errorStyle: React.CSSProperties = {
  background: "rgba(197,101,93,.12)",
  color: "#8f3d36",
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: ".92rem",
};
const warningStyle: React.CSSProperties = {
  background: "rgba(232,203,151,.28)",
  color: "#7c5a2a",
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: ".88rem",
  marginBottom: 12,
};
const linkRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 18,
  width: "100%",
};
const linkStyle: React.CSSProperties = { color: "#8b4b3e", textDecoration: "none", fontWeight: 600 };
