import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ClosedNotebookAuthLayout from "../components/ClosedNotebookAuthLayout";
import { login } from "../services/api";

const PENDING_LOGIN_EMAIL_KEY = "pendingLoginEmail";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/dashboard");
  }, [navigate]);

  const fieldErrors = useMemo(() => {
    const next = { email: "", password: "" };
    if (!email.trim()) next.email = "Email is required.";
    if (!password.trim()) next.password = "Password is required.";
    return next;
  }, [email, password]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (fieldErrors.email || fieldErrors.password) {
      setError(fieldErrors.email || fieldErrors.password);
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      await login(normalizedEmail, password);
      sessionStorage.setItem(PENDING_LOGIN_EMAIL_KEY, normalizedEmail);
      navigate("/verify-code");
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "Invalid email or password.";
      setError(message);
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
          font-size: clamp(2rem, 3vw, 2.55rem);
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

        .field-input.error {
          border-color: #cc6b5f;
        }

        .field-error {
          margin-top: 6px;
          color: #cc6b5f;
          font-size: 0.78rem;
          line-height: 1.35;
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

        .field-wrap {
          position: relative;
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

        @media (max-width: 640px) {
          .auth-form {
            max-width: 276px;
          }

          .auth-title {
            font-size: 1.72rem;
          }

          .auth-subtitle {
            font-size: 0.92rem;
            margin-bottom: 22px;
          }

          .field-input {
            font-size: 1.05rem;
          }
        }
      `}</style>
      <form className="auth-form" onSubmit={handleLogin} noValidate>
        <div className="auth-title">Welcome back</div>
        <div className="auth-subtitle">
          Sign in on the notebook label, then confirm the 6-digit code sent to your inbox to finish opening your workspace.
        </div>
        <div className="field">
          <label className="field-label">Email</label>
          <input
            className={`field-input ${fieldErrors.email ? "error" : ""}`}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
          {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
        </div>
        <div className="field">
          <label className="field-label">Password</label>
          <div className="field-wrap">
            <input
              className={`field-input ${fieldErrors.password ? "error" : ""}`}
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="toggle-pw"
              onClick={() => setShowPassword((value) => !value)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
        </div>
        <button className="submit-btn" type="submit" disabled={loading}>
          {loading ? "Sending code..." : "Continue"}
        </button>
        {error && <div className="error-msg">{error}</div>}
        <div className="form-divider" aria-hidden="true" />
        <div className="auth-links">
          <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
          <br />
          <Link to="/register" className="auth-link">Create account</Link>
        </div>
      </form>
    </ClosedNotebookAuthLayout>
  );
}
