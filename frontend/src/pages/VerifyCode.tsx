import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import HalfOpenNotebookAuthLayout from "../components/HalfOpenNotebookAuthLayout";
import { useAuth } from "../auth/AuthContext";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 60;

/**
 * VerifyCode
 * ---------------------------------------------------------------------------
 * UI for the 6-digit email verification code described in
 * ARCHITECTURE_PLAN.md §3. The backend endpoints
 *   POST /auth/verify-code   { code }
 *   POST /auth/resend-code   { email }
 * are not implemented yet — both calls are stubbed and clearly marked
 * with `TODO(backend):`. Once the routes ship, swap the stubs for real
 * fetch calls and the page is ready.
 *
 * Behaviour
 *  - 6 input boxes with paste support (paste a 6-digit string anywhere → fills all)
 *  - Auto-advance on input, auto-retreat on Backspace
 *  - Resend with a 60s cooldown counter
 */
export default function VerifyCode() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [resending, setResending] = useState(false);

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setInterval(() => {
      setResendIn((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendIn]);

  // Focus the first input on mount.
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const code = useMemo(() => digits.join(""), [digits]);
  const isComplete = code.length === CODE_LENGTH && /^\d{6}$/.test(code);

  function setDigit(index: number, value: string) {
    setDigits((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function focusInput(index: number) {
    const el = inputsRef.current[index];
    if (el) {
      el.focus();
      el.select();
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>, index: number) {
    const raw = event.target.value.replace(/\D+/g, "");
    if (!raw) {
      setDigit(index, "");
      return;
    }
    // If the user typed multiple digits (some browsers fire a single change
    // for paste-into-input), spread them across the remaining boxes.
    if (raw.length > 1) {
      setDigits((current) => {
        const next = [...current];
        for (let i = 0; i < raw.length && index + i < CODE_LENGTH; i++) {
          next[index + i] = raw[i];
        }
        return next;
      });
      const nextFocus = Math.min(index + raw.length, CODE_LENGTH - 1);
      window.requestAnimationFrame(() => focusInput(nextFocus));
      return;
    }
    setDigit(index, raw);
    if (index < CODE_LENGTH - 1) {
      window.requestAnimationFrame(() => focusInput(index + 1));
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      setDigit(index - 1, "");
      focusInput(index - 1);
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
    } else if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D+/g, "");
    if (pasted.length === 0) return;
    event.preventDefault();
    setDigits(() => {
      const next = Array(CODE_LENGTH).fill("");
      for (let i = 0; i < pasted.length && i < CODE_LENGTH; i++) next[i] = pasted[i];
      return next;
    });
    const nextFocus = Math.min(pasted.length, CODE_LENGTH - 1);
    window.requestAnimationFrame(() => focusInput(nextFocus));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isComplete) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      // TODO(backend): replace with a real POST to /auth/verify-code.
      // const res = await fetch(`${API}/auth/verify-code`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ code }),
      // });
      // if (!res.ok) throw new Error((await res.json()).error || "Invalid code");
      await new Promise((r) => setTimeout(r, 400));
      setSuccess("Code accepted. Redirecting…");
      window.setTimeout(() => navigate("/dashboard", { replace: true }), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't verify the code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendIn > 0 || resending) return;
    setError(null);
    setResending(true);
    try {
      // TODO(backend): replace with a real POST to /auth/resend-code.
      // await fetch(`${API}/auth/resend-code`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email: user?.email }),
      // });
      await new Promise((r) => setTimeout(r, 350));
      setSuccess(`A new code is on its way to ${user?.email ?? "your inbox"}.`);
      setResendIn(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resend the code.");
    } finally {
      setResending(false);
    }
  }

  return (
    <HalfOpenNotebookAuthLayout>
      <style>{`
        .vc-grid {
          display: grid;
          grid-template-columns: repeat(${CODE_LENGTH}, minmax(0, 1fr));
          gap: 10px;
          margin: 8px 0 4px;
        }
        .vc-box {
          width: 100%;
          aspect-ratio: 1 / 1.18;
          font: inherit;
          font-family: var(--nb-font-serif);
          font-size: clamp(1.6rem, 4vw, 2.2rem);
          text-align: center;
          color: var(--nb-ink);
          background: rgba(255, 251, 244, 0.96);
          border: 1px solid rgba(107, 82, 66, 0.22);
          border-radius: 12px;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .vc-box:focus {
          outline: none;
          border-color: rgba(197, 101, 93, 0.6);
          background: #fffdf7;
          box-shadow: 0 0 0 3px rgba(197, 101, 93, 0.18);
        }
        .vc-resend {
          margin-top: 6px;
          font-size: 0.92rem;
          color: var(--nb-ink-soft);
        }
        .vc-resend button {
          background: transparent;
          border: 0;
          color: #8b4b3e;
          font: inherit;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
        }
        .vc-resend button:disabled { color: var(--nb-ink-faint); cursor: not-allowed; }
      `}</style>

      <p className="auth-kicker">Step 2 of 2</p>
      <h1 className="auth-title">Enter your 6-digit code</h1>
      <p className="auth-copy">
        We sent a code to <strong>{user?.email ?? "your email"}</strong>. It expires
        in 10 minutes.
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="vc-grid" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              className="vc-box"
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              onChange={(event) => handleChange(event, index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}
        {success && <p className="auth-success">{success}</p>}

        <button type="submit" className="auth-submit" disabled={submitting || !isComplete}>
          {submitting ? "Verifying…" : "Verify code"}
        </button>

        <p className="vc-resend">
          Didn't get it?{" "}
          <button type="button" onClick={handleResend} disabled={resendIn > 0 || resending}>
            {resending
              ? "Sending…"
              : resendIn > 0
              ? `Resend in ${resendIn}s`
              : "Resend code"}
          </button>
        </p>
      </form>

      <p className="auth-link-row center">
        <Link to="/login" className="auth-link">
          Back to sign in
        </Link>
      </p>
    </HalfOpenNotebookAuthLayout>
  );
}
