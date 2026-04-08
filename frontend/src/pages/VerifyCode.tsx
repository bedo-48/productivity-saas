import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ClosedNotebookAuthLayout from "../components/ClosedNotebookAuthLayout";
import { resendLoginCode, verifyLoginCode } from "../services/api";

const PENDING_LOGIN_EMAIL_KEY = "pendingLoginEmail";

export default function VerifyCode() {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isOpening, setIsOpening] = useState(false);
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
      setSuccess("Verification complete!");
      setIsOpening(true);
      // Start opening animation, then navigate
      setTimeout(() => navigate("/dashboard"), 2000);
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
    <ClosedNotebookAuthLayout className={isOpening ? "notebook-opening" : ""}>
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

        .verify-email {
          color: #8b6e63;
          font-weight: 600;
        }

        .digits {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-bottom: 20px;
        }

        .digit-input {
          width: 36px;
          height: 44px;
          border-radius: 6px;
          border: 1px solid rgba(72, 57, 49, 0.3);
          background: rgba(255, 255, 255, 0.9);
          color: #3e342d;
          font-size: 1.2rem;
          font-weight: 700;
          text-align: center;
          outline: none;
          font-family: "Patrick Hand", cursive;
        }

        .digit-input:focus {
          border-color: #8b6e63;
          background: #fff;
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

        .resend-btn {
          background: none;
          border: none;
          color: #8b6e63;
          font-size: 0.8rem;
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
          margin-top: 12px;
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(204, 107, 95, 0.1);
          border: 1px solid rgba(204, 107, 95, 0.3);
          color: #cc6b5f;
          font-size: 0.8rem;
          text-align: center;
        }

        .success-msg {
          margin-top: 12px;
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(109, 148, 182, 0.1);
          border: 1px solid rgba(109, 148, 182, 0.3);
          color: #6d9478;
          font-size: 0.8rem;
          text-align: center;
        }
      `}</style>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-title">Enter your sign-in code</div>
        <div className="auth-subtitle">
          Enter the 6-digit code sent to: <span className="verify-email">{pendingEmail}</span>
        </div>
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}
        {!isOpening && (
          <>
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
            <button className="submit-btn" type="submit" disabled={loading || digits.join("").length !== 6}>
              {loading ? "Verifying..." : "Verify code"}
            </button>
            <button className="resend-btn" type="button" onClick={handleResend} disabled={cooldown > 0}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </>
        )}
      </form>
    </ClosedNotebookAuthLayout>
  );
}
