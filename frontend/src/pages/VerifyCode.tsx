import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { resendLoginCode, verifyLoginCode } from "../services/api";

const PENDING_LOGIN_EMAIL_KEY = "pendingLoginEmail";

export default function VerifyCode() {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const pendingEmail = sessionStorage.getItem(PENDING_LOGIN_EMAIL_KEY) || "";

  useEffect(() => {
    if (!pendingEmail) {
      navigate("/");
      return;
    }
    refs.current[0]?.focus();
  }, [navigate, pendingEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timeout = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [cooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const paste = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) {
      setDigits(paste.split(""));
      refs.current[5]?.focus();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = digits.join("");

    if (code.length !== 6) {
      setError("Enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const data = await verifyLoginCode(pendingEmail, code);
      localStorage.setItem("token", data.token);
      sessionStorage.removeItem(PENDING_LOGIN_EMAIL_KEY);
      setSuccess("Verification complete. Redirecting...");
      window.setTimeout(() => navigate("/dashboard"), 700);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Invalid code.");
      setDigits(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail || cooldown > 0) return;
    setError("");
    setSuccess("");

    try {
      await resendLoginCode(pendingEmail);
      setSuccess("A fresh 6-digit code was sent.");
      setCooldown(60);
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Failed to resend code.");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .verify-root {
          min-height: 100vh;
          background: #0e0e12;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          padding: 24px;
        }
        .verify-card {
          width: 100%;
          max-width: 460px;
          background: #16161e;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 40px 32px;
          text-align: center;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5);
        }
        .verify-icon { font-size: 42px; margin-bottom: 16px; display: block; }
        .verify-title {
          font-family: 'Syne', sans-serif;
          font-size: 24px;
          font-weight: 800;
          color: #fff;
          margin-bottom: 8px;
        }
        .verify-sub {
          font-size: 14px;
          color: #8e8ea4;
          margin-bottom: 28px;
          line-height: 1.6;
        }
        .verify-email {
          color: #c7d2fe;
          font-weight: 600;
        }
        .digits { display: flex; gap: 10px; justify-content: center; margin-bottom: 24px; }
        .digit-input {
          width: 50px;
          height: 58px;
          border-radius: 12px;
          border: 2px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: #fff;
          font-size: 22px;
          font-weight: 700;
          text-align: center;
          outline: none;
          transition: border-color 0.2s;
          font-family: 'Syne', sans-serif;
        }
        .digit-input:focus { border-color: #6366f1; background: rgba(99,102,241,0.08); }
        .verify-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
          margin-bottom: 18px;
        }
        .verify-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .resend-btn {
          background: none;
          border: none;
          color: #a5b4fc;
          font-size: 13px;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
          font-family: 'DM Sans', sans-serif;
        }
        .resend-btn:disabled { color: #55556a; cursor: default; text-decoration: none; }
        .msg-error, .msg-success { font-size: 13px; margin-bottom: 12px; }
        .msg-error { color: #f87171; }
        .msg-success { color: #34d399; }
      `}</style>
      <div className="verify-root">
        <div className="verify-card">
          <span className="verify-icon">&#128231;</span>
          <div className="verify-title">Enter your sign-in code</div>
          <div className="verify-sub">
            Enter the 6-digit code sent to your email: <span className="verify-email">{pendingEmail}</span>
          </div>
          {error && <div className="msg-error">{error}</div>}
          {success && <div className="msg-success">{success}</div>}
          <form onSubmit={handleSubmit}>
            <div className="digits" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => { refs.current[index] = element; }}
                  className="digit-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                />
              ))}
            </div>
            <button className="verify-btn" type="submit" disabled={loading || digits.join("").length !== 6}>
              {loading ? "Verifying..." : "Verify code"}
            </button>
          </form>
          <button className="resend-btn" type="button" onClick={handleResend} disabled={cooldown > 0}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
        </div>
      </div>
    </>
  );
}
