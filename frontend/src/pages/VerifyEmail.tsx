import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClosedNotebookAuthLayout from "../components/ClosedNotebookAuthLayout";
import { sendVerification, verifyEmail, resendCode } from "../services/api";

const PENDING_VERIFICATION_EMAIL_KEY = "pendingVerificationEmail";

export default function VerifyEmail() {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isOpening, setIsOpening] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";
  const pendingEmail = sessionStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY) || "";

  useEffect(() => {
    if (!token && !pendingEmail) {
      navigate("/");
      return;
    }
    refs.current[0]?.focus();
  }, [navigate, pendingEmail, token]);

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
    if (error) setError("");
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
    if (code.length !== 6) {
      setError("Enter the full 6-digit verification code.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await verifyEmail(code, token || undefined, pendingEmail || undefined);
      sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
      setSuccess("Email verified!");
      setIsOpening(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed.";
      setError(message);
      if (message.toLowerCase().includes("token")) {
        localStorage.removeItem("token");
      }
      setDigits(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      if (token) {
        await resendCode(token);
      } else if (pendingEmail) {
        await sendVerification(pendingEmail);
      } else {
        throw new Error("No email is available for this verification request.");
      }
      setCooldown(60);
      setError("");
      setSuccess("New code sent to your email!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <ClosedNotebookAuthLayout className={isOpening ? "notebook-opening" : ""}>
      <style>{`
        .auth-form {
          width: 100%;
          max-width: 340px;
          text-align: center;
        }

        .auth-title {
          font-family: "Newsreader", serif;
          font-size: clamp(2rem, 3vw, 2.45rem);
          font-weight: 600;
          color: #3e342d;
          margin-bottom: 10px;
          letter-spacing: -0.02em;
        }

        .auth-subtitle {
          font-size: 1rem;
          color: #6b564a;
          margin-bottom: 24px;
          line-height: 1.65;
        }

        .digits {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-bottom: 24px;
        }

        .digit-input {
          width: 44px;
          height: 54px;
          border-radius: 10px;
          border: 1px solid rgba(72, 57, 49, 0.24);
          background: rgba(255, 252, 247, 0.94);
          color: #3e342d;
          font-size: 1.45rem;
          font-weight: 700;
          text-align: center;
          outline: none;
          font-family: "Patrick Hand", cursive;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
        }

        .digit-input:focus {
          border-color: #8b6e63;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(208, 143, 88, 0.12);
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
          margin-top: 12px;
          box-shadow: 0 14px 24px rgba(169, 99, 69, 0.24);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .resend-btn {
          background: none;
          border: none;
          color: #8b6e63;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
          font-family: "Manrope", sans-serif;
          margin-top: 12px;
        }

        .resend-btn:disabled {
          color: #9b877b;
          cursor: default;
          text-decoration: none;
        }

        .error-msg {
          margin-top: 14px;
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(204, 107, 95, 0.1);
          border: 1px solid rgba(204, 107, 95, 0.3);
          color: #cc6b5f;
          font-size: 0.82rem;
          line-height: 1.45;
          text-align: center;
        }

        .success-msg {
          margin-top: 14px;
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(109, 148, 182, 0.1);
          border: 1px solid rgba(109, 148, 182, 0.3);
          color: #6d9478;
          font-size: 0.82rem;
          line-height: 1.45;
          text-align: center;
        }
      `}</style>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-title">Check your email</div>
        <div className="auth-subtitle">
          We sent a 6-digit code to {pendingEmail || "your email"}. Enter it below to verify your account.
        </div>
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}
        {!isOpening && (
          <>
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
            <button className="submit-btn" type="submit" disabled={loading || digits.join("").length !== 6}>
              {loading ? "Verifying..." : "Verify email"}
            </button>
            <button className="resend-btn" type="button" onClick={handleResend} disabled={cooldown > 0 || resending}>
              {resending ? "Sending..." : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </>
        )}
      </form>
    </ClosedNotebookAuthLayout>
  );
}
