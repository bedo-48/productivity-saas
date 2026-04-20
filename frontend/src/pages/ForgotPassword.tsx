import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import ClosedNotebookAuthLayout from "../components/ClosedNotebookAuthLayout";
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
    <ClosedNotebookAuthLayout>
      <h1 style={titleStyle}>Reset your password</h1>
      <p style={copyStyle}>
        Enter the email on your account. We'll send a link to set a new password.
      </p>

      {!configured && (
        <p style={warningStyle}>
          Firebase isn't configured. Copy <code>frontend/.env.example</code> to <code>frontend/.env</code> and fill in the values.
        </p>
      )}

      <form onSubmit={handleSubmit} style={formStyle}>
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

        {error && <p style={errorStyle}>{error}</p>}
        {message && <p style={successStyle}>{message}</p>}

        <button type="submit" disabled={submitting || !configured} style={submitStyle}>
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p style={linkRowStyle}>
        Remembered it? <Link to="/login" style={linkStyle}>Back to sign in</Link>
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
const successStyle: React.CSSProperties = { background: "rgba(120,147,155,.18)", color: "#3c5a60", padding: "10px 12px", borderRadius: 10, fontSize: ".92rem" };
const warningStyle: React.CSSProperties = { background: "rgba(232,203,151,.28)", color: "#7c5a2a", padding: "10px 12px", borderRadius: 10, fontSize: ".88rem", marginBottom: 12 };
const linkRowStyle: React.CSSProperties = { marginTop: 18, color: "#6f5b4f" };
const linkStyle: React.CSSProperties = { color: "#8b4b3e", textDecoration: "none", fontWeight: 600 };
