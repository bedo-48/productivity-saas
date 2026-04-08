import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Signature from "./Signature";
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .login-root {
          min-height: 100vh;
          background: #0e0e12;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          font-family: 'DM Sans', sans-serif;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }
        .login-root::before {
          content: '';
          position: fixed;
          top: -20%;
          right: -10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 70%);
          pointer-events: none;
        }
        .login-root::after {
          content: '';
          position: fixed;
          bottom: -20%;
          left: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(236,72,153,0.09) 0%, transparent 70%);
          pointer-events: none;
        }
        .login-card {
          width: 100%;
          max-width: 420px;
          background: #16161e;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 36px 32px;
          position: relative;
          z-index: 1;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.08);
        }
        .login-logo {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #ec4899);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin-bottom: 24px;
          box-shadow: 0 8px 20px rgba(99,102,241,0.3);
        }
        .login-title {
          font-family: 'Syne', sans-serif;
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          margin-bottom: 6px;
        }
        .login-subtitle {
          font-size: 13px;
          color: #8e8ea4;
          font-weight: 300;
          margin-bottom: 26px;
          line-height: 1.6;
        }
        .field { margin-bottom: 16px; }
        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #7878a0;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 8px;
        }
        .field-wrap { position: relative; }
        .field-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 12px 14px;
          color: #e8e8f0;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .field-input.has-toggle { padding-right: 44px; }
        .field-input:focus {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.06);
        }
        .field-input.error { border-color: rgba(239,68,68,0.5); }
        .field-input::placeholder { color: #45455a; }
        .toggle-pw {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #55556a;
          cursor: pointer;
          font-size: 16px;
        }
        .field-error {
          margin-top: 8px;
          color: #f87171;
          font-size: 12px;
        }
        .submit-btn {
          width: 100%;
          padding: 13px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          margin-top: 8px;
          box-shadow: 0 4px 20px rgba(99,102,241,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error-msg {
          margin-top: 16px;
          padding: 11px 14px;
          border-radius: 10px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #f87171;
          font-size: 13px;
          text-align: center;
        }
        .divider {
          height: 1px;
          background: rgba(255,255,255,0.05);
          margin: 28px 0 20px;
        }
        .footer-text {
          text-align: center;
          font-size: 13px;
          color: #63637b;
        }
        .footer-link {
          color: #818cf8;
          text-decoration: none;
          font-weight: 500;
        }
      `}</style>
      <div className="login-root">
        <div className="login-card">
          <div className="login-logo">&#10003;</div>
          <div className="login-title">Welcome back</div>
          <div className="login-subtitle">
            Sign in with your email and password, then confirm the 6-digit code sent to your inbox.
          </div>
          <form onSubmit={handleLogin} noValidate>
            <div className="field">
              <label className="field-label">Email</label>
              <div className="field-wrap">
                <input
                  className={`field-input ${fieldErrors.email ? "error" : ""}`}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
            </div>
            <div className="field">
              <label className="field-label">Password</label>
              <div className="field-wrap">
                <input
                  className={`field-input has-toggle ${fieldErrors.password ? "error" : ""}`}
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
              {loading ? (
                <>
                  <span className="spinner" />
                  Sending code...
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>
          {error && <div className="error-msg">{error}</div>}
          <div className="divider" />
          <p className="footer-text" style={{ marginBottom: "10px" }}>
            <Link to="/forgot-password" className="footer-link">Forgot password?</Link>
          </p>
          <p className="footer-text">
            Don&apos;t have an account? <Link to="/register" className="footer-link">Create one</Link>
          </p>
        </div>
        <Signature />
      </div>
    </>
  );
}
