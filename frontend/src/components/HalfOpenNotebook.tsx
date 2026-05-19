import { type ReactNode } from "react";

/*
 * HalfOpenNotebook — the new signature visual for Notebook v2.
 *
 * A 3D notebook propped open at ~32°: front cover lifted, ruled page
 * revealed underneath. Children render on top of the page (kept on the
 * DOM layer with z-index, not inside the SVG, so forms behave normally).
 *
 * Used by the auth layout, focus mode, and the landing hero.
 */

export type HalfOpenNotebookVariant = "dark" | "kraft" | "linen";

interface HalfOpenNotebookProps {
  children?: ReactNode;
  /** CSS width of the wrapper. */
  width?: number | string;
  /** CSS min-height of the wrapper. */
  height?: number | string;
  /** Cover variant. Default "dark" (black leather). */
  variant?: HalfOpenNotebookVariant;
  /** Extra class on the root wrapper. */
  className?: string;
}

const COVERS: Record<HalfOpenNotebookVariant, { top: string; mid: string; bottom: string }> = {
  dark:  { top: "#1f1c1e", mid: "#121011", bottom: "#070707" },
  kraft: { top: "#caa069", mid: "#a87a44", bottom: "#7a5424" },
  linen: { top: "#efe3c9", mid: "#dcc99f", bottom: "#bda878" },
};

export default function HalfOpenNotebook({
  children,
  width = "min(100%, 720px)",
  height = 560,
  variant = "dark",
  className = "",
}: HalfOpenNotebookProps) {
  const cover = COVERS[variant];

  return (
    <div
      className={`half-open-notebook ${className}`}
      style={{ width, minHeight: typeof height === "number" ? `${height}px` : height }}
    >
      <style>{`
        .half-open-notebook {
          position: relative;
          margin: 0 auto;
          padding: 0;
        }
        .hon-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          filter: drop-shadow(0 28px 38px rgba(40, 26, 16, 0.32));
        }
        .hon-content {
          position: relative;
          z-index: 2;
          width: 78%;
          margin: 0 auto;
          padding: 8% 7% 9%;
          min-height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .hon-content::before {
          /* ruled paper, layered under children via a pseudo-element so
             form controls stay readable */
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            linear-gradient(180deg, rgba(255, 252, 245, 0.86), rgba(247, 238, 222, 0.86)),
            repeating-linear-gradient(
              180deg,
              rgba(116, 157, 197, 0) 0,
              rgba(116, 157, 197, 0) 34px,
              rgba(116, 157, 197, 0.22) 34px,
              rgba(116, 157, 197, 0.22) 36px
            );
          border-radius: 4px 16px 16px 4px;
          border: 1px solid rgba(106, 84, 71, 0.12);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }
        .hon-content::after {
          /* red margin rule */
          content: "";
          position: absolute;
          top: 6%;
          bottom: 6%;
          left: 9%;
          width: 1.5px;
          background: linear-gradient(
            180deg,
            rgba(205, 94, 111, 0.0),
            rgba(205, 94, 111, 0.5) 12%,
            rgba(205, 94, 111, 0.55) 88%,
            rgba(205, 94, 111, 0.0)
          );
          pointer-events: none;
          z-index: -1;
        }
        @media (max-width: 640px) {
          .hon-content {
            width: 88%;
            padding: 12% 7% 10%;
          }
        }
      `}</style>

      <svg
        className="hon-svg"
        viewBox="0 0 720 560"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hon-cover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cover.top} />
            <stop offset="55%" stopColor={cover.mid} />
            <stop offset="100%" stopColor={cover.bottom} />
          </linearGradient>
          <linearGradient id="hon-spine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={cover.mid} />
            <stop offset="50%" stopColor={cover.bottom} />
            <stop offset="100%" stopColor={cover.mid} />
          </linearGradient>
          <linearGradient id="hon-page" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fffcf5" />
            <stop offset="100%" stopColor="#f1e6cf" />
          </linearGradient>
          <radialGradient id="hon-page-shadow" cx="0.5" cy="0" r="0.65">
            <stop offset="0%" stopColor="rgba(40,28,18,0.32)" />
            <stop offset="100%" stopColor="rgba(40,28,18,0)" />
          </radialGradient>
          <linearGradient id="hon-cover-glare" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* Desk shadow under the notebook */}
        <ellipse cx="360" cy="540" rx="290" ry="14" fill="rgba(40,24,14,0.28)" />

        {/* Bottom cover (laid flat, what the page sits on) */}
        <path
          d="M 60 200 L 660 200 L 686 540 L 34 540 Z"
          fill="url(#hon-cover)"
        />
        {/* Spine */}
        <path
          d="M 60 200 L 660 200 L 654 210 L 66 210 Z"
          fill="url(#hon-spine)"
          opacity="0.85"
        />

        {/* The revealed ruled page */}
        <path
          d="M 88 218 L 632 218 L 654 522 L 66 522 Z"
          fill="url(#hon-page)"
          stroke="rgba(106,84,71,0.14)"
          strokeWidth="1"
        />
        {/* Cast shadow from raised cover onto page (top edge) */}
        <path
          d="M 88 218 L 632 218 L 624 264 L 96 264 Z"
          fill="url(#hon-page-shadow)"
          opacity="0.6"
        />

        {/* Top cover, lifted ~32°, slight perspective */}
        <g transform="translate(0 0)">
          <path
            d="M 60 200 L 660 200 L 612 24 L 108 24 Z"
            fill="url(#hon-cover)"
          />
          <path
            d="M 60 200 L 660 200 L 612 24 L 108 24 Z"
            fill="url(#hon-cover-glare)"
            opacity="0.45"
          />
          {/* Subtle stitched border on the lifted cover */}
          <path
            d="M 120 36 L 600 36 L 644 188 L 76 188 Z"
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
          {/* Embossed monogram dot */}
          <circle cx="360" cy="110" r="6" fill="rgba(255,255,255,0.12)" />
        </g>

        {/* Page edge highlight (where cover meets page along the spine) */}
        <path
          d="M 88 218 L 632 218"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="1"
        />
      </svg>

      <div className="hon-content">{children}</div>
    </div>
  );
}
