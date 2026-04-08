import { useState } from "react";
import { Link } from "react-router-dom";
import ClosedNotebookAuthLayout from "../components/ClosedNotebookAuthLayout";
import { forgotPassword } from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await forgotPassword(normalizedEmail);
      setEmail(normalizedEmail);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset code.");
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

        .field-input:focus {
          border-color: #8b6e63;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(208, 143, 88, 0.12);
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
          opacity: 0.6;
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
          line-height: 1.45;
          text-align: center;
        }

        .success-box {
          text-align: center;
          padding: 8px 0 0;
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
      {!sent ? (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-title">Reset password</div>
          <div className="auth-subtitle">
            Enter your email and we&apos;ll send you a 6-digit password reset code.
          </div>
          <div className="field">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <button className="submit-btn" type="submit" disabled={loading || !email.trim()}>
            {loading ? "Sending..." : "Send reset code"}
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
          <div className="success-title">Check your email</div>
          <div className="success-text">
            We sent a 6-digit password reset code to {email}. Enter it on the reset password page to choose a new password.
          </div>
          <div className="form-divider" aria-hidden="true" />
          <div className="auth-links">
            <Link to={`/reset-password?email=${encodeURIComponent(email)}`} className="auth-link">Continue to reset password</Link>
            <br />
            <Link to="/" className="auth-link">Back to sign in</Link>
          </div>
        </div>
      )}
    </ClosedNotebookAuthLayout>
  );
}
