import { useEffect, useState } from "react";
import {login} from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import Signature from "./Signature";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/dashboard");
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const data = await login(email, password);
      localStorage.setItem("token", data.token);
      if (data.requiresVerification) {
        navigate("/verify-email");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setMessage(err.message || "Invalid email or password.");
      console.error(err);
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
          max-width: 400px;
          background: #16161e;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 36px 32px;
          position: relative;
          z-index: 1;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.08);
          animation: slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
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
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }

        .login-subtitle {
          font-size: 13px;
          color: #6b6b7e;
          font-weight: 300;
          margin-bottom: 32px;
        }

        .field {
          margin-bottom: 16px;
        }

        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #7878a0;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 8px;
        }

        .field-wrap {
          position: relative;
        }

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

        .field-input::placeholder { color: #45455a; }

        .field-input:focus {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.06);
        }

        .field-input.has-toggle {
          padding-right: 44px;
        }

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
          padding: 2px;
          transition: color 0.2s;
          line-height: 1;
        }

        .toggle-pw:hover { color: #9898b8; }

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

        .submit-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-msg {
          margin-top: 16px;
          padding: 11px 14px;
          border-radius: 10px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #f87171;
          font-size: 13px;
          text-align: center;
          animation: fadeIn 0.25s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .divider {
          height: 1px;
          background: rgba(255,255,255,0.05);
          margin: 28px 0 20px;
        }

        .footer-text {
          text-align: center;
          font-size: 13px;
          color: #45455a;
        }

        .footer-link {
          color: #818cf8;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }

        .footer-link:hover { color: #a5b4fc; }
      `}</style>

      <div className="login-root">
        <div className="login-card">

          <div className="login-logo">✓</div>
          <div className="login-title">Welcome back</div>
          <div className="login-subtitle">Sign in to manage your tasks</div>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div className="field">
              <label className="field-label">Email</label>
              <div className="field-wrap">
                <input
                  className="field-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="field">
              <label className="field-label">Password</label>
              <div className="field-wrap">
                <input
                  className="field-input has-toggle"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="toggle-pw"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <button
              className="submit-btn"
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {message && <div className="error-msg">⚠ {message}</div>}

          <div className="divider" />
          <p className="footer-text">
            Don't have an account?{" "}
            <Link to="/register" className="footer-link">Create one</Link>
          </p>

        </div>
        <Signature />
      </div>
    </>
  );
}
