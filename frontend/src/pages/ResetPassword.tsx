import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import ClosedNotebookAuthLayout from "../components/ClosedNotebookAuthLayout";
import { resetPassword } from "../services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const fieldError = useMemo(() => {
    if (!email.trim()) return "Email is required.";
    if (!code.trim()) return "Reset code is required.";
    if (code.trim().length !== 6) return "The reset code must be exactly 6 digits.";
    if (!newPassword) return "New password is required.";
    if (newPassword.length < 8) return "Password must be at least 8 characters long.";
    if (confirmPassword !== newPassword) return "Password confirmation does not match.";
    return "";
  }, [code, confirmPassword, email, newPassword]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (fieldError) {
      setError(fieldError);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(
        email.trim().toLowerCase(),
        code.trim(),
        newPassword,
        confirmPassword
      );
      setDone(true);
      window.setTimeout(() => navigate("/"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClosedNotebookAuthLayout>
      <style>{`
        .auth-form {
          width: 100%;
          max-width: 340px;
          text-align: center;
        }

        .auth-title {
          font-family: "Newsreader", serif;
          font-size: clamp(2rem, 3vw, 2.45rem);
          font-weight: 600;
          color: #3e342d;
          margin-bottom: 10px;
          letter-spacing: -0.02em;
        }

        .auth-subtitle {
          font-size: 1rem;
          color: #6b564a;
          margin-bottom: 28px;
          line-height: 1.65;
        }

        .field {
          margin-bottom: 16px;
          text-align: left;
        }

        .field-label {
          display: block;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #5a463d;
          margin-bottom: 7px;
          font-family: "Manrope", sans-serif;
        }

        .field-wrap {
          position: relative;
        }

        .field-input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid rgba(72, 57, 49, 0.24);
          border-radius: 10px;
          background: rgba(255, 252, 247, 0.94);
          color: #3e342d;
          font-family: "Patrick Hand", cursive;
          font-size: 1.18rem;
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
        }

        .field-input.has-toggle {
          padding-right: 64px;
        }

        .field-input:focus {
          border-color: #8b6e63;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(208, 143, 88, 0.12);
        }

        .toggle-pw {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6b564a;
          cursor: pointer;
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .code-hint {
          font-size: 0.78rem;
          color: #7f695d;
          margin-top: 6px;
          line-height: 1.4;
        }

        .submit-btn {
          width: 100%;
          padding: 13px 16px;
          border-radius: 999px;
          border: none;
          background: linear-gradient(135deg, #d08f58, #c5655d);
          color: #fffaf4;
          font-family: "Manrope", sans-serif;
          font-size: 0.96rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          margin-top: 18px;
          box-shadow: 0 14px 24px rgba(169, 99, 69, 0.24);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-msg {
          margin-top: 16px;
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(204, 107, 95, 0.1);
          border: 1px solid rgba(204, 107, 95, 0.3);
          color: #cc6b5f;
          font-size: 0.82rem;
          text-align: center;
          line-height: 1.45;
        }

        .success-box {
          text-align: center;
          padding: 6px 0 0;
        }

        .success-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 12px;
          color: #6d9478;
        }

        .success-title {
          font-family: "Newsreader", serif;
          font-size: 1.6rem;
          font-weight: 600;
          color: #3e342d;
          margin-bottom: 8px;
        }

        .success-text {
          font-size: 1rem;
          color: #6b564a;
          margin-bottom: 20px;
          line-height: 1.65;
        }

        .auth-links {
          margin-top: 22px;
          font-size: 0.86rem;
          color: #6b564a;
          line-height: 1.8;
        }

        .auth-link {
          color: #8b6e63;
          text-decoration: none;
          font-weight: 700;
        }

        .auth-link:hover {
          color: #5f473d;
        }

        .form-divider {
          width: 100%;
          height: 1px;
          margin: 20px 0 0;
          background: linear-gradient(90deg, transparent, rgba(104, 81, 68, 0.24), transparent);
        }
      `}</style>
      {!done ? (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-title">Set new password</div>
          <div className="auth-subtitle">
            Enter the 6-digit reset code from your email, then choose the new password you want to write into your notebook.
          </div>

          <div className="field">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label className="field-label">Reset code</label>
            <input
              className="field-input"
              type="text"
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            />
            <div className="code-hint">Use the same email that requested the reset code.</div>
          </div>

          <div className="field">
            <label className="field-label">New password</label>
            <div className="field-wrap">
              <input
                className="field-input has-toggle"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
              />
              <button type="button" className="toggle-pw" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Confirm password</label>
            <input
              className="field-input"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button
            className="submit-btn"
            type="submit"
            disabled={loading || Boolean(fieldError)}
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>

          {error && <div className="error-msg">{error}</div>}
          <div className="form-divider" aria-hidden="true" />
          <div className="auth-links">
            <Link to="/" className="auth-link">Back to sign in</Link>
          </div>
        </form>
      ) : (
        <div className="success-box">
          <div className="success-icon">OK</div>
          <div className="success-title">Password reset</div>
          <div className="success-text">
            Your password was updated successfully. We&apos;ll send you back to sign in so you can open the notebook again.
          </div>
          <div className="form-divider" aria-hidden="true" />
          <div className="auth-links">
            <Link to="/" className="auth-link">Back to sign in</Link>
          </div>
        </div>
      )}
    </ClosedNotebookAuthLayout>
  );
}
