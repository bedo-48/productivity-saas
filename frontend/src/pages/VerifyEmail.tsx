import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { applyActionCode, sendEmailVerification } from "firebase/auth";
import HalfOpenNotebookAuthLayout from "../components/HalfOpenNotebookAuthLayout";
import { auth } from "../services/firebase";
import { useAuth } from "../auth/AuthContext";
import { humanizeFirebaseError } from "../auth/firebaseErrors";

type Mode = "applying" | "waiting" | "success" | "error";

/**
 * VerifyEmail
 * ---------------------------------------------------------------------------
 * Two entry points:
 *   1. `?oobCode=…` — Firebase email-verification landing link. We apply
 *      the code, show a "verified" success state, and offer a link to the
 *      dashboard.
 *   2. No oobCode — show a "check your email" waiting state with a resend
 *      button for the currently signed-in user.
 */
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, configured } = useAuth();
  const oobCode = params.get("oobCode");

  const [mode, setMode] = useState<Mode>(oobCode ? "applying" : "waiting");
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<null | "sending" | "sent">(null);

  // If we landed with an oobCode, apply it.
  useEffect(() => {
    if (!oobCode || !auth) return;
    let cancelled = false;
    (async () => {
      try {
        await applyActionCode(auth, oobCode);
        if (cancelled) return;
        // Refresh the user's token so emailVerified flips to true.
        if (auth.currentUser) await auth.currentUser.reload().catch(() => undefined);
        setMode("success");
      } catch (err) {
        if (cancelled) return;
        setError(humanizeFirebaseError(err));
        setMode("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [oobCode]);

  async function handleResend() {
    if (!auth?.currentUser) {
      setError("You need to be signed in to resend the verification email.");
      return;
    }
    setError(null);
    setResendStatus("sending");
    try {
      await sendEmailVerification(auth.currentUser);
      setResendStatus("sent");
    } catch (err) {
      setError(humanizeFirebaseError(err));
      setResendStatus(null);
    }
  }

  return (
    <HalfOpenNotebookAuthLayout>
      <p className="auth-kicker">Step 2 of 2</p>
      <h1 className="auth-title">Verify your email</h1>

      {!configured && (
        <p className="auth-warning">
          Firebase isn't configured. Copy <code>frontend/.env.example</code> to{" "}
          <code>frontend/.env</code> and fill in the values.
        </p>
      )}

      {mode === "applying" && (
        <p className="auth-copy">Confirming your email link…</p>
      )}

      {mode === "success" && (
        <>
          <p className="auth-copy">Your email is verified. You're all set.</p>
          <button
            type="button"
            className="auth-submit"
            onClick={() => navigate("/dashboard", { replace: true })}
          >
            Open the notebook
          </button>
        </>
      )}

      {mode === "error" && (
        <>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <p className="auth-copy" style={{ marginTop: 14 }}>
            The link may have expired. You can request a new one below.
          </p>
          <button
            type="button"
            className="auth-submit"
            onClick={handleResend}
            disabled={resendStatus === "sending" || !user}
          >
            {resendStatus === "sending" ? "Sending…" : "Send a new link"}
          </button>
        </>
      )}

      {mode === "waiting" && (
        <>
          <p className="auth-copy">
            We sent a verification link to{" "}
            <strong>{user?.email ?? "your inbox"}</strong>. Click the link to
            finish setting up your account.
          </p>

          {resendStatus === "sent" && (
            <p className="auth-success">A new link is on its way.</p>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            className="auth-submit"
            onClick={handleResend}
            disabled={resendStatus === "sending" || !user}
          >
            {resendStatus === "sending" ? "Sending…" : "Resend verification link"}
          </button>
        </>
      )}

      <p className="auth-link-row center">
        <Link to="/login" className="auth-link">
          Back to sign in
        </Link>
      </p>
    </HalfOpenNotebookAuthLayout>
  );
}
