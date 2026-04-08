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
          background: radial-gradient(circle at top left, rgba(196,177,145,.3), transparent 34%),
                      radial-gradient(circle at right 18%, rgba(143,170,173,.18), transparent 28%),
                      linear-gradient(180deg, #e7dcc7 0%, #d8c7ab 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: "Manrope", sans-serif;
          position: relative;
        }

        .stationery {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 40px;
          opacity: 0.8;
        }

        .pencil-stationery {
          width: 20px;
          height: 120px;
          background: linear-gradient(180deg, #f3ca67, #d99f2b);
          border-radius: 10px;
          position: relative;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .pencil-stationery::before {
          content: '';
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 20px;
          background: linear-gradient(180deg, #f0a7a6, #d68483);
          border-radius: 8px 8px 4px 4px;
        }

        .pencil-stationery::after {
          content: '';
          position: absolute;
          bottom: -12px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 20px solid #c49d72;
        }

        .pen-stationery {
          width: 8px;
          height: 100px;
          background: linear-gradient(180deg, #2c2c2c, #000);
          border-radius: 4px;
          position: relative;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .pen-stationery::before {
          content: '';
          position: absolute;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 12px;
          height: 16px;
          background: #ff0000;
          border-radius: 6px 6px 3px 3px;
        }

        .eraser-stationery {
          width: 18px;
          height: 16px;
          background: linear-gradient(180deg, #ffb3ba, #ff8694);
          border-radius: 4px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .notebook-closed {
          width: 600px;
          height: 400px;
          background: linear-gradient(135deg, #8b4513, #654321);
          border-radius: 12px;
          position: relative;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          border: 2px solid #5d3a1a;
          transition: transform 2s ease-in-out, opacity 2s ease-in-out;
        }

        .notebook-spine {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 20px;
          background: linear-gradient(180deg, #654321, #4a2c17);
          border-radius: 6px 0 0 6px;
        }

        .notebook-cover {
          position: absolute;
          left: 20px;
          top: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #d2b48c, #bc9864);
          border-radius: 0 12px 12px 0;
          border-right: 2px solid #a0784a;
          border-top: 2px solid #a0784a;
          border-bottom: 2px solid #a0784a;
        }

        .notebook-label {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 320px;
          height: 280px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(0,0,0,0.2);
          border-radius: 8px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px;
          font-family: "Patrick Hand", cursive;
          color: #3e342d;
          transition: opacity 1s ease-in-out;
        }

        .notebook-label::before {
          content: '';
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 4px;
          background: #8b4513;
          border-radius: 2px;
        }

        /* Opening animation */
        .notebook-opening .notebook-closed {
          transform: perspective(1000px) rotateY(-180deg);
          opacity: 0;
        }

        .notebook-opening .notebook-label {
          opacity: 0;
        }

        @media (max-width: 640px) {
          .notebook-closed {
            width: 90vw;
            height: 320px;
          }
          .notebook-label {
            width: 280px;
            height: 240px;
          }
          .stationery {
            gap: 20px;
          }
          .pencil-stationery {
            height: 100px;
          }
          .pen-stationery {
            height: 80px;
          }
        }
      `}</style>
      <div className={`auth-root ${className}`}>
        <div className="stationery">
          <div className="pencil-stationery"></div>
          <div className="pen-stationery"></div>
          <div className="eraser-stationery"></div>
        </div>
        <div className="notebook-closed">
          <div className="notebook-spine"></div>
          <div className="notebook-cover">
            <div className="notebook-label">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}