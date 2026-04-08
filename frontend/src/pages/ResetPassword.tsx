import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const fieldError = useMemo(() => {
    if (!email.trim()) return "Email is required.";
    if (!code.trim()) return "Reset code is required.";
    if (code.trim().length !== 6) return "The reset code must be exactly 6 digits.";
    if (!newPassword) return "New password is required.";
    if (newPassword.length < 8) return "Password must be at least 8 characters long.";
    if (confirmPassword !== newPassword) return "Password confirmation does not match.";
    return "";
  }, [code, confirmPassword, email, newPassword]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (fieldError) {
      setError(fieldError);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(
        email.trim().toLowerCase(),
        code.trim(),
        newPassword,
        confirmPassword
      );
      setDone(true);
      window.setTimeout(() => navigate("/"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
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
          font-size: 20px; margin-bottom: 24px; color: #fff;
        }
        .rp-title { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 6px; }
        .rp-sub { font-size: 13px; color: #6b6b7e; margin-bottom: 28px; line-height: 1.5; }
        .field { margin-bottom: 16px; }
        .field-label { display: block; font-size: 12px; font-weight: 500; color: #7878a0; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; }
        .field-wrap { position: relative; }
        .field-input {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 12px 14px; color: #e8e8f0;
          font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; transition: all 0.2s;
        }
        .field-input.has-toggle { padding-right: 60px; }
        .field-input::placeholder { color: #45455a; }
        .field-input:focus { border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.06); }
        .toggle-pw {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 12px; font-weight: 600;
        }
        .code-hint { font-size: 11px; color: #6b7280; margin-top: 5px; line-height: 1.4; }
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
          color: #f87171; font-size: 13px; text-align: center; line-height: 1.5;
        }
        .success-box { text-align: center; padding: 20px 0; }
        .success-icon { font-size: 36px; display: block; margin-bottom: 16px; color: #34d399; }
        .success-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: #34d399; margin-bottom: 8px; }
        .success-text { font-size: 13px; color: #6b6b7e; line-height: 1.5; }
        .divider { height: 1px; background: rgba(255,255,255,0.05); margin: 24px 0 20px; }
        .footer-text { text-align: center; font-size: 13px; color: #45455a; }
        .footer-link { color: #818cf8; text-decoration: none; font-weight: 500; }
        .footer-link:hover { color: #a5b4fc; }
      `}</style>

      <div className="rp-root">
        <div className="rp-card">
          <div className="rp-logo">PW</div>

          {done ? (
            <div className="success-box">
              <span className="success-icon">OK</span>
              <div className="success-title">Password reset</div>
              <p className="success-text">Your password was updated successfully. Redirecting you to sign in.</p>
            </div>
          ) : (
            <>
              <div className="rp-title">Set new password</div>
              <div className="rp-sub">Enter the 6-digit code from your email and choose a new password.</div>

              <form onSubmit={handleSubmit} noValidate>
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

                <div className="field">
                  <label className="field-label">Reset code</label>
                  <input
                    className="field-input"
                    type="text"
                    placeholder="123456"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  />
                  <div className="code-hint">Use the same email that requested the reset code.</div>
                </div>

                <div className="field">
                  <label className="field-label">New password</label>
                  <div className="field-wrap">
                    <input
                      className="field-input has-toggle"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                    <button type="button" className="toggle-pw" onClick={() => setShowPassword((value) => !value)}>
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Confirm password</label>
                  <input
                    className="field-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>

                <button
                  className="submit-btn"
                  type="submit"
                  disabled={loading || Boolean(fieldError)}
                >
                  {loading ? "Resetting..." : "Reset password"}
                </button>
              </form>

              {error && <div className="error-msg">{error}</div>}
            </>
          )}

          <div className="divider" />
          <p className="footer-text">
            <Link to="/" className="footer-link">Back to sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
