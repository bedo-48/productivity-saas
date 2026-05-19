import { type ReactNode } from "react";
import NotebookBackdrop from "./NotebookBackdrop";
import HalfOpenNotebook, { type HalfOpenNotebookVariant } from "./HalfOpenNotebook";

/*
 * HalfOpenNotebookAuthLayout
 * ---------------------------------------------------------------------------
 * Drop-in replacement for ClosedNotebookAuthLayout. Same .auth-* class API
 * (title / copy / form / field / label / input / submit / error / warning /
 * link-row / link) so consumer pages (Login, Register, ForgotPassword,
 * VerifyEmail, VerifyCode, ResetPassword) don't need to change anything
 * beyond the import path.
 *
 * The signature visual swap: a 3D notebook propped half-open at ~32°,
 * instead of the closed leather cover with a label glued on top.
 */

interface HalfOpenNotebookAuthLayoutProps {
  children: ReactNode;
  className?: string;
  variant?: HalfOpenNotebookVariant;
}

export default function HalfOpenNotebookAuthLayout({
  children,
  className = "",
  variant = "dark",
}: HalfOpenNotebookAuthLayoutProps) {
  return (
    <>
      <style>{`
        *, *::before, *::after {
          box-sizing: border-box;
        }
        .auth-root {
          min-height: 100vh;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          font-family: var(--nb-font-sans);
          background:
            radial-gradient(circle at 14% 16%, rgba(248, 232, 204, 0.42), transparent 22%),
            radial-gradient(circle at 82% 18%, rgba(194, 152, 106, 0.20), transparent 26%),
            radial-gradient(circle at 50% 100%, rgba(120, 71, 44, 0.20), transparent 38%),
            linear-gradient(135deg, #c58f61 0%, #b57a51 28%, #a86e47 58%, #8d5a37 100%);
        }
        .auth-root::before {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            115deg,
            rgba(255,255,255,0.025) 0,
            rgba(255,255,255,0.025) 14px,
            rgba(73, 41, 24, 0.03) 14px,
            rgba(73, 41, 24, 0.03) 28px
          );
          opacity: 0.55;
          pointer-events: none;
        }

        .auth-desk-papers {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .auth-desk-papers .scrap {
          position: absolute;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.95), rgba(242, 233, 217, 0.92)),
            repeating-linear-gradient(
              180deg,
              rgba(85, 118, 157, 0) 0,
              rgba(85, 118, 157, 0) 22px,
              rgba(85, 118, 157, 0.15) 22px,
              rgba(85, 118, 157, 0.15) 24px
            );
          border: 1px solid rgba(112, 83, 61, 0.16);
          box-shadow: 0 18px 28px rgba(71, 39, 21, 0.16);
          border-radius: 10px;
        }
        .auth-desk-papers .scrap.a { width: 180px; height: 220px; top: 40px;  left: 5%;   transform: rotate(-12deg); }
        .auth-desk-papers .scrap.b { width: 160px; height: 200px; top: 110px; right: 6%;  transform: rotate(14deg); }
        .auth-desk-papers .scrap.c { width: 160px; height: 180px; bottom: 70px; left: 12%; transform: rotate(8deg); opacity: 0.78; }

        .auth-stage {
          position: relative;
          z-index: 1;
          width: min(100%, 760px);
        }

        /* ── Shared auth form chrome ─────────────────────────────────────── */
        .auth-title {
          font-family: var(--nb-font-serif);
          font-weight: 600;
          font-size: clamp(1.7rem, 2.6vw, 2.05rem);
          line-height: 1.1;
          letter-spacing: -0.01em;
          color: var(--nb-ink);
          margin: 0 0 6px;
        }
        .auth-kicker {
          margin: 0 0 6px;
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--nb-ink-faint);
          font-family: var(--nb-font-sans);
        }
        .auth-copy {
          margin: 0 0 22px;
          color: var(--nb-ink-soft);
          font-size: 0.95rem;
          line-height: 1.45;
        }
        .auth-form { display: grid; gap: 14px; width: 100%; }
        .auth-field { display: grid; gap: 6px; }
        .auth-label {
          font-size: 0.74rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #7c675a;
          font-weight: 600;
        }
        .auth-input {
          width: 100%;
          font: inherit;
          color: #4d3b31;
          background: rgba(255, 251, 244, 0.92);
          border: 1px solid rgba(107, 82, 66, 0.18);
          border-radius: 12px;
          padding: 12px 14px;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .auth-input::placeholder { color: #b3a094; }
        .auth-input:hover { border-color: rgba(107, 82, 66, 0.32); }
        .auth-input:focus {
          outline: none;
          border-color: rgba(197, 101, 93, 0.55);
          background: #fffdf7;
          box-shadow: 0 0 0 3px rgba(197, 101, 93, 0.18);
        }
        .auth-input:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-submit {
          font: inherit;
          font-weight: 600;
          letter-spacing: 0.01em;
          color: #fffaf4;
          background: linear-gradient(135deg, var(--nb-terracotta-2), var(--nb-terracotta));
          border: 0;
          border-radius: 14px;
          padding: 13px 18px;
          margin-top: 6px;
          cursor: pointer;
          box-shadow: 0 10px 22px rgba(169, 99, 69, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.32);
          transition: transform 0.12s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }
        .auth-submit:hover:not(:disabled) {
          filter: brightness(1.05);
          box-shadow: 0 14px 26px rgba(169, 99, 69, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.34);
        }
        .auth-submit:active:not(:disabled) { transform: translateY(1px); }
        .auth-submit:focus-visible { outline: 2px solid #fffdf7; outline-offset: 2px; }
        .auth-submit:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
        .auth-error {
          margin: 0;
          background: var(--nb-error-bg);
          color: var(--nb-error-fg);
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 0.9rem;
          border-left: 3px solid rgba(197, 101, 93, 0.6);
        }
        .auth-success {
          margin: 0;
          background: var(--nb-success-bg);
          color: var(--nb-success-fg);
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 0.92rem;
          border-left: 3px solid rgba(120, 147, 155, 0.6);
        }
        .auth-warning {
          margin: 0 0 14px;
          background: var(--nb-warn-bg);
          color: var(--nb-warn-fg);
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 0.88rem;
          border-left: 3px solid rgba(200, 156, 83, 0.6);
        }
        .auth-warning code {
          background: rgba(255, 251, 244, 0.6);
          padding: 1px 5px;
          border-radius: 4px;
          font-size: 0.85em;
        }
        .auth-link-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 18px;
          width: 100%;
          color: var(--nb-ink-soft);
          font-size: 0.93rem;
        }
        .auth-link-row.center { justify-content: center; }
        .auth-link {
          color: #8b4b3e;
          text-decoration: none;
          font-weight: 600;
          border-bottom: 1px solid transparent;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .auth-link:hover { color: #6e3328; border-bottom-color: rgba(110, 51, 40, 0.35); }
        .auth-link:focus-visible {
          outline: 2px solid rgba(139, 75, 62, 0.55);
          outline-offset: 3px;
          border-radius: 2px;
        }

        @media (max-width: 720px) {
          .auth-desk-papers .scrap.a,
          .auth-desk-papers .scrap.b,
          .auth-desk-papers .scrap.c { display: none; }
        }
      `}</style>

      <div className={`auth-root ${className}`}>
        <NotebookBackdrop palette="dark" density={26} seed={4242} />
        <div className="auth-desk-papers" aria-hidden="true">
          <div className="scrap a" />
          <div className="scrap b" />
          <div className="scrap c" />
        </div>

        <div className="auth-stage">
          <HalfOpenNotebook variant={variant} width="100%" height={620}>
            {children}
          </HalfOpenNotebook>
        </div>
      </div>
    </>
  );
}
