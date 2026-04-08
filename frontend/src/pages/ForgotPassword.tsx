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
          max-width: 280px;
          text-align: center;
        }

        .auth-title {
          font-family: "Newsreader", serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #3e342d;
          margin-bottom: 8px;
        }

        .auth-subtitle {
          font-size: 0.9rem;
          color: #6b564a;
          margin-bottom: 20px;
          line-height: 1.4;
        }

        .field {
          margin-bottom: 12px;
          text-align: left;
        }

        .field-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 500;
          color: #5a463d;
          margin-bottom: 4px;
          font-family: "Manrope", sans-serif;
        }

        .field-input {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid rgba(72, 57, 49, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.9);
          color: #3e342d;
          font-family: "Patrick Hand", cursive;
          font-size: 1rem;
          outline: none;
        }

        .field-input:focus {
          border-color: #8b6e63;
          background: #fff;
        }

        .submit-btn {
          width: 100%;
          padding: 10px;
          border-radius: 6px;
          border: none;
          background: linear-gradient(135deg, #d08f58, #c5655d);
          color: #fffaf4;
          font-family: "Manrope", sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          margin-top: 12px;
          box-shadow: 0 4px 12px rgba(169, 99, 69, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-msg {
          margin-top: 12px;
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(204, 107, 95, 0.1);
          border: 1px solid rgba(204, 107, 95, 0.3);
          color: #cc6b5f;
          font-size: 0.8rem;
          text-align: center;
        }

        .success-box {
          text-align: center;
          padding: 20px 0;
        }

        .success-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 12px;
          color: #6d9478;
        }

        .success-title {
          font-family: "Newsreader", serif;
          font-size: 1.3rem;
          font-weight: 600;
          color: #3e342d;
          margin-bottom: 8px;
        }

        .success-text {
          font-size: 0.9rem;
          color: #6b564a;
          margin-bottom: 16px;
          line-height: 1.4;
        }

        .auth-links {
          margin-top: 16px;
          font-size: 0.8rem;
          color: #6b564a;
        }

        .auth-link {
          color: #8b6e63;
          text-decoration: none;
          font-weight: 500;
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
