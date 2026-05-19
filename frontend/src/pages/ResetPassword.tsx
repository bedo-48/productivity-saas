import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import HalfOpenNotebookAuthLayout from "../components/HalfOpenNotebookAuthLayout";
import { auth } from "../services/firebase";
import { useAuth } from "../auth/AuthContext";
import { humanizeFirebaseError } from "../auth/firebaseErrors";

type Stage = "verifying" | "ready" | "submitting" | "done" | "invalid";

/**
 * Returns a strength score 0–4 and a human label. Naive but useful enough
 * to give the user a "stronger, please" cue without depending on zxcvbn.
 */
function rateStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^\w\s]/.test(password)) score++;
  const clamped = Math.min(4, score);
  const label = ["Too short", "Weak", "Fair", "Strong", "Very strong"][clamped];
  return { score: clamped, label };
}

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { configured } = useAuth();
  const oobCode = params.get("oobCode");

  const [stage, setStage] = useState<Stage>(oobCode ? "verifying" : "invalid");
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const strength = useMemo(() => rateStrength(password), [password]);

  // Verify the oobCode on mount so we can show the user the matching email
  // and bail early if the link is bogus.
  useEffect(() => {
    if (!oobCode || !auth) return;
    let cancelled = false;
    (async () => {
      try {
        const email = await verifyPasswordResetCode(auth, oobCode);
        if (cancelled) return;
        setAccountEmail(email);
        setStage("ready");
      } catch (err) {
        if (cancelled) return;
        setError(humanizeFirebaseError(err));
        setStage("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [oobCode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!oobCode || !auth) return;
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setStage("submitting");
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStage("done");
    } catch (err) {
      setError(humanizeFirebaseError(err));
      setStage("ready");
    }
  }

  return (
    <HalfOpenNotebookAuthLayout>
      <style>{`
        .rp-strength {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
          margin-top: 4px;
        }
        .rp-strength span {
          height: 6px;
          border-radius: 999px;
          background: rgba(107, 82, 66, 0.16);
          transition: background 0.18s ease;
        }
        .rp-strength.s1 span:nth-child(1) { background: #cc6b5f; }
        .rp-strength.s2 span:nth-child(-n+2) { background: #d08f58; }
        .rp-strength.s3 span:nth-child(-n+3) { background: #c89c53; }
        .rp-strength.s4 span { background: #6d9478; }
        .rp-strength-label {
          margin-top: 4px;
          font-size: 0.82rem;
          color: var(--nb-ink-faint);
        }
      `}</style>

      <p className="auth-kicker">Recover access</p>
      <h1 className="auth-title">Set a new password</h1>

      {!configured && (
        <p className="auth-warning">
          Firebase isn't configured. Copy <code>frontend/.env.example</code> to{" "}
          <code>frontend/.env</code>.
        </p>
      )}

      {stage === "verifying" && <p className="auth-copy">Checking your reset link…</p>}

      {stage === "invalid" && (
        <>
          <p className="auth-copy">
            This reset link is invalid or has expired. Request a new one from
            the forgot-password page.
          </p>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <p className="auth-link-row center">
            <Link to="/forgot-password" className="auth-link">
              Request a new link
            </Link>
          </p>
        </>
      )}

      {stage === "done" && (
        <>
          <p className="auth-success">
            Your password has been updated. You can sign in now.
          </p>
          <button
            type="button"
            className="auth-submit"
            onClick={() => navigate("/login", { replace: true })}
          >
            Go to sign in
          </button>
        </>
      )}

      {(stage === "ready" || stage === "submitting") && (
        <>
          <p className="auth-copy">
            {accountEmail
              ? `Setting a new password for ${accountEmail}.`
              : "Choose a new password for your account."}
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <label className="auth-field">
              <span className="auth-label">New password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="auth-input"
                disabled={stage === "submitting"}
              />
              <div className={`rp-strength s${strength.score}`} aria-hidden="true">
                <span /> <span /> <span /> <span />
              </div>
              {password && (
                <div className="rp-strength-label">{strength.label}</div>
              )}
            </label>

            <label className="auth-field">
              <span className="auth-label">Confirm password</span>
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="auth-input"
                disabled={stage === "submitting"}
              />
            </label>

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button
              type="submit"
              className="auth-submit"
              disabled={stage === "submitting" || password.length < 6 || password !== confirm}
            >
              {stage === "submitting" ? "Saving…" : "Update password"}
            </button>
          </form>

          <p className="auth-link-row center">
            <Link to="/login" className="auth-link">
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </HalfOpenNotebookAuthLayout>
  );
}
