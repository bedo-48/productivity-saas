import { useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setSent(true);
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
        .fp-root {
          min-height: 100vh; background: #0e0e12; display: flex;
          flex-direction: column; justify-content: center; align-items: center;
          font-family: 'DM Sans', sans-serif; padding: 24px;
        }
        .fp-card {
          width: 100%; max-width: 400px; background: #16161e;
          border: 1px solid rgba(255,255,255,0.07); border-radius: 20px;
          padding: 36px 32px; box-shadow: 0 24px 60px rgba(0,0,0,0.5);
          animation: slideUp 0.4s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fp-logo {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #ec4899);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; margin-bottom: 24px;
        }
        .fp-title { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 6px; }
        .fp-sub { font-size: 13px; color: #6b6b7e; margin-bottom: 28px; }
        .field { margin-bottom: 16px; }
        .field-label { display: block; font-size: 12px; font-weight: 500; color: #7878a0; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; }
        .field-input {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 12px 14px; color: #e8e8f0;
          font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; transition: all 0.2s;
        }
        .field-input::placeholder { color: #45455a; }
        .field-input:focus { border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.06); }
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
        .success-box {
          text-align: center; padding: 20px 0;
        }
        .success-icon { font-size: 48px; display: block; margin-bottom: 16px; }
        .success-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .success-text { font-size: 13px; color: #6b6b7e; margin-bottom: 24px; line-height: 1.6; }
        .back-link {
          display: inline-flex; align-items: center; gap: 6px;
          color: #818cf8; text-decoration: none; font-size: 13px; font-weight: 500;
          transition: color 0.2s;
        }
        .back-link:hover { color: #a5b4fc; }
        .divider { height: 1px; background: rgba(255,255,255,0.05); margin: 24px 0 20px; }
        .footer-text { text-align: center; font-size: 13px; color: #45455a; }
        .footer-link { color: #818cf8; text-decoration: none; font-weight: 500; }
        .footer-link:hover { color: #a5b4fc; }
      `}</style>

      <div className="fp-root">
        <div className="fp-card">
          <div className="fp-logo">🔑</div>

          {sent ? (
            <div className="success-box">
              <span className="success-icon">📬</span>
              <div className="success-title">Check your inbox</div>
              <p className="success-text">
                We sent a 6-digit reset code to <strong style={{ color: "#a5b4fc" }}>{email}</strong>.<br />
                It expires in 10 minutes.
              </p>
              <Link to="/reset-password" className="back-link">
                → Enter the code
              </Link>
            </div>
          ) : (
            <>
              <div className="fp-title">Forgot password?</div>
              <div className="fp-sub">Enter your email and we'll send a reset code</div>

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
                <button className="submit-btn" type="submit" disabled={loading || !email.trim()}>
                  {loading ? "Sending..." : "Send reset code"}
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
