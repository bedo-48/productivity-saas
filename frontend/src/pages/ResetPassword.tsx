import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setDone(true);
      setTimeout(() => navigate("/"), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .rp-root {
          min-height: 100vh; background: #0e0e12; display: flex;
          flex-direction: column; justify-content: center; align-items: center;
          font-family: 'DM Sans', sans-serif; padding: 24px;
        }
        .rp-card {
          width: 100%; max-width: 400px; background: #16161e;
          border: 1px solid rgba(255,255,255,0.07); border-radius: 20px;
          padding: 36px 32px; box-shadow: 0 24px 60px rgba(0,0,0,0.5);
          animation: slideUp 0.4s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rp-logo {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #ec4899);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; margin-bottom: 24px;
        }
        .rp-title { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 6px; }
        .rp-sub { font-size: 13px; color: #6b6b7e; margin-bottom: 28px; }
        .field { margin-bottom: 16px; }
        .field-label { display: block; font-size: 12px; font-weight: 500; color: #7878a0; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; }
        .field-wrap { position: relative; }
        .field-input {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 12px 14px; color: #e8e8f0;
          font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; transition: all 0.2s;
        }
        .field-input.has-toggle { padding-right: 44px; }
        .field-input::placeholder { color: #45455a; }
        .field-input:focus { border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.06); }
        .toggle-pw {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: #55556a; cursor: pointer; font-size: 16px;
        }
        .code-hint { font-size: 11px; color: #45455a; margin-top: 5px; }
        .submit-btn {
          width: 100%; padding: 13px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #6366f1, #818cf8); color: white;
          font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 500;
          cursor: pointer; transition: opacity 0.2s, transform 0.15s; margin-top: 8px;
          box-shadow: 0 4px 20px rgba(99,102,241,0.35);
        }
        .submit-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error-msg {
          margin-top: 14px; padding: 11px 14px; border-radius: 10px;
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
          color: #f87171; font-size: 13px; text-align: center;
        }
        .success-box { text-align: center; padding: 20px 0; }
        .success-icon { font-size: 48px; display: block; margin-bottom: 16px; }
        .success-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: #34d399; margin-bottom: 8px; }
        .success-text { font-size: 13px; color: #6b6b7e; }
        .divider { height: 1px; background: rgba(255,255,255,0.05); margin: 24px 0 20px; }
        .footer-text { text-align: center; font-size: 13px; color: #45455a; }
        .footer-link { color: #818cf8; text-decoration: none; font-weight: 500; }
        .footer-link:hover { color: #a5b4fc; }
      `}</style>

      <div className="rp-root">
        <div className="rp-card">
          <div className="rp-logo">🔒</div>

          {done ? (
            <div className="success-box">
              <span className="success-icon">✅</span>
              <div className="success-title">Password reset!</div>
              <p className="success-text">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <div className="rp-title">Set new password</div>
              <div className="rp-sub">Enter the code from your email and choose a new password</div>

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="field-label">Email</label>
                  <input
                    className="field-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label className="field-label">Reset code</label>
                  <input
                    className="field-input"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                  <div className="code-hint">6-digit code from your email</div>
                </div>

                <div className="field">
                  <label className="field-label">New password</label>
                  <div className="field-wrap">
                    <input
                      className="field-input has-toggle"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="toggle-pw" onClick={() => setShowPassword(v => !v)}>
                      {showPassword ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>

                <button
                  className="submit-btn"
                  type="submit"
                  disabled={loading || !email || !code || newPassword.length < 8}
                >
                  {loading ? "Resetting..." : "Reset password"}
                </button>
              </form>

              {error && <div className="error-msg">⚠ {error}</div>}
            </>
          )}

          <div className="divider" />
          <p className="footer-text">
            <Link to="/" className="footer-link">← Back to sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
