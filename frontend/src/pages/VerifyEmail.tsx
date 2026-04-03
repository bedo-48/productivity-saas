import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { verifyEmail, resendCode } from "../services/api";

export default function VerifyEmail() {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";

  useEffect(() => {
    if (!token) navigate("/");
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) {
      setDigits(paste.split(""));
      refs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) return;
    setLoading(true);
    setError("");
    try {
      await verifyEmail(code, token);
      setSuccess("Email verified!");
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err: any) {
      setError(err.message || "Invalid code");
      setDigits(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await resendCode(token);
      setCooldown(60);
      setError("");
      setSuccess("New code sent to your email!");
    } catch {
      setError("Failed to resend code");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0e0e12; }
        .verify-root {
          min-height: 100vh; background: #0e0e12; display: flex;
          align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif; padding: 24px;
        }
        .verify-card {
          width: 100%; max-width: 420px; background: #16161e;
          border: 1px solid rgba(255,255,255,0.07); border-radius: 20px;
          padding: 40px 32px; text-align: center;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5);
          animation: slideUp 0.4s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .verify-icon { font-size: 48px; margin-bottom: 16px; display: block; }
        .verify-title { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 8px; }
        .verify-sub { font-size: 14px; color: #6b6b7e; margin-bottom: 32px; }
        .digits { display: flex; gap: 10px; justify-content: center; margin-bottom: 28px; }
        .digit-input {
          width: 48px; height: 56px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04); color: #fff; font-size: 22px; font-weight: 700;
          text-align: center; outline: none; transition: border-color 0.2s;
          font-family: 'Syne', sans-serif;
        }
        .digit-input:focus { border-color: #6366f1; background: rgba(99,102,241,0.08); }
        .verify-btn {
          width: 100%; padding: 14px; border-radius: 12px; border: none;
          background: linear-gradient(135deg, #6366f1, #818cf8); color: white;
          font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: opacity 0.2s; margin-bottom: 20px;
        }
        .verify-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .resend-btn {
          background: none; border: none; color: #6366f1; font-size: 13px;
          cursor: pointer; text-decoration: underline; padding: 0;
          font-family: 'DM Sans', sans-serif;
        }
        .resend-btn:disabled { color: #55556a; cursor: default; text-decoration: none; }
        .msg-error { color: #f87171; font-size: 13px; margin-bottom: 12px; }
        .msg-success { color: #34d399; font-size: 13px; margin-bottom: 12px; }
      `}</style>
      <div className="verify-root">
        <div className="verify-card">
          <span className="verify-icon">📬</span>
          <div className="verify-title">Check your email</div>
          <div className="verify-sub">We sent a 6-digit code to your email. Enter it below to verify your account.</div>

          {error && <div className="msg-error">{error}</div>}
          {success && <div className="msg-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="digits" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { refs.current[i] = el; }}
                  className="digit-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                />
              ))}
            </div>
            <button className="verify-btn" type="submit" disabled={loading || digits.join("").length < 6}>
              {loading ? "Verifying..." : "Verify email"}
            </button>
          </form>

          <button className="resend-btn" onClick={handleResend} disabled={cooldown > 0}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
        </div>
      </div>
    </>
  );
}
