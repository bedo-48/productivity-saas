import { type ReactNode } from "react";

interface ClosedNotebookAuthLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function ClosedNotebookAuthLayout({ children, className = "" }: ClosedNotebookAuthLayoutProps) {
  return (
    <>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,600&family=Patrick+Hand&family=Manrope:wght@400;500;600;700&display=swap");

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .auth-root {
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(circle at 14% 16%, rgba(248, 232, 204, 0.42), transparent 20%),
            radial-gradient(circle at 82% 18%, rgba(194, 152, 106, 0.18), transparent 24%),
            radial-gradient(circle at 50% 100%, rgba(120, 71, 44, 0.18), transparent 35%),
            linear-gradient(135deg, #c58f61 0%, #b57a51 28%, #a86e47 58%, #8d5a37 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          font-family: "Manrope", sans-serif;
          position: relative;
        }

        .auth-root::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(
              115deg,
              rgba(255,255,255,0.025) 0,
              rgba(255,255,255,0.025) 14px,
              rgba(73, 41, 24, 0.03) 14px,
              rgba(73, 41, 24, 0.03) 28px
            );
          opacity: 0.55;
          pointer-events: none;
        }

        .desk-shadow {
          position: relative;
          width: min(100%, 980px);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 22px;
        }

        .desk-shadow::before {
          content: "";
          position: absolute;
          width: min(82vw, 720px);
          height: 80px;
          bottom: 18px;
          left: 50%;
          transform: translateX(-50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(61, 33, 18, 0.3) 0%, rgba(61, 33, 18, 0.08) 58%, transparent 75%);
          filter: blur(10px);
          pointer-events: none;
        }

        .desk-paper {
          position: absolute;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.96), rgba(242, 233, 217, 0.92)),
            repeating-linear-gradient(
              180deg,
              rgba(85, 118, 157, 0) 0,
              rgba(85, 118, 157, 0) 28px,
              rgba(85, 118, 157, 0.16) 28px,
              rgba(85, 118, 157, 0.16) 30px
            );
          border: 1px solid rgba(112, 83, 61, 0.14);
          box-shadow: 0 18px 28px rgba(71, 39, 21, 0.16);
          opacity: 0.9;
          pointer-events: none;
        }

        .desk-paper.one {
          width: 210px;
          height: 280px;
          top: 36px;
          left: 54px;
          transform: rotate(-14deg);
          border-radius: 10px;
        }

        .desk-paper.two {
          width: 190px;
          height: 248px;
          right: 70px;
          top: 82px;
          transform: rotate(12deg);
          border-radius: 12px;
        }

        .desk-paper.three {
          width: 180px;
          height: 220px;
          left: 112px;
          bottom: 46px;
          transform: rotate(9deg);
          opacity: 0.74;
          border-radius: 10px;
        }

        .desk-note {
          position: relative;
          width: 88px;
          height: 88px;
          border-radius: 18px 20px 16px 22px;
          background: linear-gradient(180deg, #f2dec0, #ddc299);
          box-shadow: 0 14px 22px rgba(68, 39, 20, 0.18);
          pointer-events: none;
        }

        .desk-note::before {
          content: "";
          position: absolute;
          inset: 20px 18px;
          background: repeating-linear-gradient(
            180deg,
            transparent 0,
            transparent 11px,
            rgba(124, 91, 67, 0.16) 11px,
            rgba(124, 91, 67, 0.16) 13px
          );
        }

        .desk-note.one {
          position: absolute;
          top: 72px;
          right: 180px;
          transform: rotate(-18deg);
        }

        .desk-note.two {
          position: absolute;
          left: 170px;
          bottom: 110px;
          transform: rotate(16deg);
        }

        .notebook-closed {
          width: min(72vw, 620px);
          aspect-ratio: 3 / 4;
          min-height: 780px;
          background:
            radial-gradient(circle at 18% 20%, rgba(255,255,255,0.06), transparent 16%),
            radial-gradient(circle at 70% 72%, rgba(255,255,255,0.05), transparent 22%),
            linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.05)),
            linear-gradient(135deg, #181718, #0d0d0e);
          border-radius: 24px;
          position: relative;
          box-shadow:
            0 34px 50px rgba(51, 27, 15, 0.34),
            0 6px 0 rgba(255,255,255,0.14) inset,
            0 -6px 16px rgba(0,0,0,0.24) inset;
          border: 1px solid rgba(255,255,255,0.12);
          transition: transform 2s ease-in-out, opacity 2s ease-in-out;
          overflow: hidden;
        }

        .notebook-closed::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 22% 28%, rgba(255,255,255,0.08) 0, transparent 24%),
            radial-gradient(circle at 68% 16%, rgba(255,255,255,0.04) 0, transparent 18%),
            repeating-linear-gradient(
              45deg,
              rgba(255,255,255,0.03) 0,
              rgba(255,255,255,0.03) 9px,
              rgba(0,0,0,0.03) 9px,
              rgba(0,0,0,0.03) 18px
            );
          mix-blend-mode: screen;
          opacity: 0.5;
          pointer-events: none;
        }

        .notebook-spine {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 64px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.24)),
            linear-gradient(90deg, #4c4c51 0%, #242428 48%, #080809 100%);
          box-shadow:
            inset -12px 0 16px rgba(255,255,255,0.06),
            inset 10px 0 18px rgba(0,0,0,0.34);
        }

        .notebook-spine::after {
          content: "";
          position: absolute;
          inset: 20px 12px;
          border-radius: 18px;
          background: repeating-linear-gradient(
            180deg,
            rgba(255,255,255,0.08) 0,
            rgba(255,255,255,0.08) 12px,
            rgba(0,0,0,0.12) 12px,
            rgba(0,0,0,0.12) 24px
          );
          opacity: 0.32;
        }

        .notebook-cover {
          position: absolute;
          left: 52px;
          top: 0;
          right: 0;
          bottom: 0;
          border-radius: 18px 24px 24px 18px;
          background:
            radial-gradient(circle at 25% 22%, rgba(255,255,255,0.12), transparent 18%),
            radial-gradient(circle at 72% 74%, rgba(255,255,255,0.08), transparent 24%),
            repeating-linear-gradient(
              132deg,
              #fcfcfb 0,
              #fcfcfb 14px,
              #0f1010 14px,
              #0f1010 30px,
              #f4f4f2 30px,
              #f4f4f2 48px,
              #151515 48px,
              #151515 66px
            );
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.14),
            inset 0 10px 20px rgba(255,255,255,0.08),
            inset 0 -10px 18px rgba(0,0,0,0.14);
        }

        .notebook-cover::before {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            45deg,
            rgba(255,255,255,0.06) 0,
            rgba(255,255,255,0.06) 2px,
            rgba(0,0,0,0.02) 2px,
            rgba(0,0,0,0.02) 5px
          );
          opacity: 0.3;
          pointer-events: none;
        }

        .notebook-label {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: min(72%, 430px);
          min-height: 540px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248, 243, 233, 0.96)),
            repeating-linear-gradient(
              180deg,
              rgba(87, 128, 170, 0) 0,
              rgba(87, 128, 170, 0) 36px,
              rgba(87, 128, 170, 0.18) 36px,
              rgba(87, 128, 170, 0.18) 38px
            );
          border: 2px solid rgba(76, 58, 46, 0.22);
          border-radius: 18px;
          box-shadow:
            inset 0 2px 6px rgba(255,255,255,0.65),
            inset 0 -12px 18px rgba(132, 107, 87, 0.08),
            0 18px 24px rgba(45, 32, 22, 0.18);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 56px 42px 52px;
          font-family: "Patrick Hand", cursive;
          color: #3e342d;
          transition: opacity 1s ease-in-out;
        }

        .notebook-label::before {
          content: "";
          position: absolute;
          top: 28px;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 14px;
          border-radius: 999px;
          background: linear-gradient(180deg, #5c4c44, #342a25);
          box-shadow: 0 2px 0 rgba(255,255,255,0.16) inset;
        }

        .notebook-label::after {
          content: "";
          position: absolute;
          inset: 18px;
          border: 1px solid rgba(110, 80, 61, 0.14);
          border-radius: 12px;
          pointer-events: none;
        }

        .stationery {
          position: absolute;
          inset: auto 0 26px 0;
          pointer-events: none;
        }

        .pencil-stationery,
        .pen-stationery,
        .eraser-stationery {
          position: absolute;
          box-shadow: 0 18px 24px rgba(55, 31, 19, 0.24);
        }

        .pencil-stationery {
          width: 30px;
          height: 228px;
          right: 138px;
          bottom: 22px;
          transform: rotate(28deg);
          border-radius: 16px;
          background: linear-gradient(180deg, #f9de77 0%, #efc144 40%, #db9a25 100%);
        }

        .pencil-stationery::before {
          content: "";
          position: absolute;
          top: -18px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 30px;
          background: linear-gradient(180deg, #f6c2cb, #df8697);
          border-radius: 12px 12px 8px 8px;
        }

        .pencil-stationery::after {
          content: "";
          position: absolute;
          bottom: -26px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 14px solid transparent;
          border-right: 14px solid transparent;
          border-top: 36px solid #d9b286;
        }

        .pen-stationery {
          width: 18px;
          height: 210px;
          left: 132px;
          bottom: 40px;
          transform: rotate(-36deg);
          border-radius: 10px;
          background: linear-gradient(180deg, #2b2c31 0%, #0d0d10 72%, #30343d 100%);
        }

        .pen-stationery::before {
          content: "";
          position: absolute;
          top: -16px;
          left: 50%;
          transform: translateX(-50%);
          width: 26px;
          height: 38px;
          border-radius: 12px 12px 8px 8px;
          background: linear-gradient(180deg, #23252a, #0b0c0f);
        }

        .pen-stationery::after {
          content: "";
          position: absolute;
          bottom: -22px;
          left: 50%;
          transform: translateX(-50%);
          width: 8px;
          height: 28px;
          border-radius: 999px;
          background: linear-gradient(180deg, #a8adb7, #4e5561);
        }

        .eraser-stationery {
          width: 80px;
          height: 44px;
          left: 50%;
          bottom: 20px;
          transform: translateX(210px) rotate(-18deg);
          border-radius: 14px;
          background: linear-gradient(135deg, #fbc5d2, #f28ca5 58%, #db7188);
          border: 1px solid rgba(135, 64, 79, 0.18);
        }

        /* Opening animation */
        .notebook-opening .notebook-closed {
          transform: perspective(1000px) rotateY(-180deg);
          opacity: 0;
        }

        .notebook-opening .notebook-label {
          opacity: 0;
        }

        @media (max-width: 900px) {
          .desk-shadow {
            width: min(100%, 840px);
          }

          .notebook-closed {
            width: min(80vw, 560px);
            min-height: 690px;
          }

          .notebook-label {
            width: min(76%, 396px);
            min-height: 490px;
            padding: 52px 34px 46px;
          }

          .desk-paper.one {
            left: 10px;
            top: 48px;
          }

          .desk-paper.two {
            right: 8px;
            top: 92px;
          }

          .desk-note.one {
            right: 104px;
          }
        }

        @media (max-width: 640px) {
          .auth-root {
            padding: 18px 14px 32px;
          }

          .desk-shadow {
            padding: 14px 4px 34px;
          }

          .notebook-closed {
            width: min(92vw, 430px);
            min-height: 570px;
            border-radius: 18px;
          }

          .notebook-spine {
            width: 46px;
          }

          .notebook-cover {
            left: 38px;
            border-radius: 14px 18px 18px 14px;
          }

          .notebook-label {
            width: min(80%, 310px);
            min-height: 410px;
            padding: 46px 24px 34px;
            border-radius: 14px;
          }

          .notebook-label::before {
            top: 20px;
            width: 92px;
            height: 12px;
          }

          .desk-paper.one,
          .desk-paper.two,
          .desk-paper.three {
            display: none;
          }

          .desk-note.one {
            top: 34px;
            right: 14px;
            transform: rotate(-10deg) scale(0.82);
          }

          .desk-note.two {
            left: 16px;
            bottom: 92px;
            transform: rotate(10deg) scale(0.78);
          }

          .stationery {
            bottom: 8px;
          }

          .pencil-stationery {
            height: 168px;
            width: 22px;
            right: 18px;
            bottom: 56px;
          }

          .pen-stationery {
            height: 150px;
            width: 14px;
            left: 20px;
            bottom: 70px;
          }

          .eraser-stationery {
            width: 58px;
            height: 34px;
            left: auto;
            right: 64px;
            bottom: 8px;
            transform: rotate(-16deg);
          }
        }
      `}</style>
      <div className={`auth-root ${className}`}>
        <div className="desk-paper one" aria-hidden="true" />
        <div className="desk-paper two" aria-hidden="true" />
        <div className="desk-paper three" aria-hidden="true" />
        <div className="desk-note one" aria-hidden="true" />
        <div className="desk-note two" aria-hidden="true" />
        <div className="stationery">
          <div className="pencil-stationery" aria-hidden="true"></div>
          <div className="pen-stationery" aria-hidden="true"></div>
          <div className="eraser-stationery" aria-hidden="true"></div>
        </div>
        <div className="desk-shadow">
          <div className="notebook-closed">
            <div className="notebook-spine"></div>
            <div className="notebook-cover">
              <div className="notebook-label">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
