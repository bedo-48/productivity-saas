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

        .field-input.error {
          border-color: #cc6b5f;
        }

        .field-error {
          margin-top: 4px;
          color: #cc6b5f;
          font-size: 0.75rem;
        }

        .toggle-pw {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6b564a;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .field-wrap {
          position: relative;
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
      <form className="auth-form" onSubmit={handleLogin} noValidate>
        <div className="auth-title">Welcome back</div>
        <div className="auth-subtitle">
          Sign in with your email and password, then confirm the 6-digit code sent to your inbox.
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
        <div className="auth-links">
          <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
          <br />
          <Link to="/register" className="auth-link">Create account</Link>
        </div>
      </form>
    </ClosedNotebookAuthLayout>
  );
}
