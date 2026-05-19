import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSuggestions, toggleTask } from "../services/api";
import { useAuth } from "../auth/AuthContext";
import NotebookBackdrop from "../components/NotebookBackdrop";
import HalfOpenNotebook from "../components/HalfOpenNotebook";
import Topbar from "../components/dashboard/Topbar";
import { priorityColor, type Task } from "../components/dashboard/types";
import "../components/dashboard/Dashboard.css";

const FOCUS_LEN_SEC = 25 * 60;

function formatClock(s: number) {
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function Focus() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [queue, setQueue] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(FOCUS_LEN_SEC);
  const [running, setRunning] = useState(false);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const suggestions = await getSuggestions();
        if (cancelled) return;
        setQueue(suggestions);
        if (suggestions.length > 0) setActiveId(suggestions[0].id);
      } catch {
        // ignore — empty queue is fine
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setRemaining((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (remaining === 0 && running) setRunning(false);
  }, [remaining, running]);

  const active = queue.find((task) => task.id === activeId) ?? null;

  function start() {
    if (remaining === 0) setRemaining(FOCUS_LEN_SEC);
    setRunning(true);
  }
  function pause() {
    setRunning(false);
  }
  function reset() {
    setRunning(false);
    setRemaining(FOCUS_LEN_SEC);
  }

  async function markDone() {
    if (!active) return;
    try {
      await toggleTask(active.id, true);
    } catch {
      /* ignore */
    }
    setQueue((current) => current.filter((task) => task.id !== active.id));
    setActiveId((current) => {
      const rest = queue.filter((task) => task.id !== current);
      return rest[0]?.id ?? null;
    });
    reset();
  }

  async function handleLogout() {
    try { await logout(); } finally { navigate("/login", { replace: true }); }
  }

  return (
    <div className="dash-root">
      <NotebookBackdrop palette="light" density={22} seed={777} />
      <style>{`
        .nb-focus { width: min(100%, 1240px); margin: 18px auto 0; display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 18px; align-items: start; }
        @media (max-width: 980px) { .nb-focus { grid-template-columns: 1fr; } }
        .nb-focus-stage { display: flex; justify-content: center; }
        .nb-focus-card { display: flex; flex-direction: column; gap: 8px; align-items: center; text-align: center; }
        .nb-focus-task { font-family: var(--nb-font-hand); font-size: clamp(1.4rem, 3vw, 2rem); color: var(--nb-ink); }
        .nb-focus-clock { font-family: var(--nb-font-serif); font-size: clamp(3rem, 8vw, 5.5rem); line-height: 1; color: var(--nb-ink); margin: 4px 0 8px; }
        .nb-focus-controls { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
        .nb-focus-controls button {
          font: inherit; font-weight: 600;
          border: 0;
          border-radius: var(--nb-radius-m);
          padding: 10px 16px;
          cursor: pointer;
          background: linear-gradient(135deg, var(--nb-terracotta-2), var(--nb-terracotta));
          color: #fffaf4;
        }
        .nb-focus-controls button.secondary {
          background: rgba(255, 248, 236, 0.78);
          color: var(--nb-ink-soft);
          border: 1px solid rgba(84,63,52,0.18);
        }
        .nb-focus-queue {
          background: rgba(249, 243, 232, 0.74);
          border: 1px solid rgba(121, 97, 81, 0.12);
          border-radius: var(--nb-radius-l);
          padding: 16px;
          box-shadow: var(--nb-shadow-card);
        }
        .nb-focus-queue h3 { margin: 4px 0 10px; font-family: var(--nb-font-serif); font-size: 1.05rem; color: var(--nb-ink); }
        .nb-focus-queue-item {
          display: flex; gap: 8px; align-items: center;
          padding: 8px 10px;
          border-radius: var(--nb-radius-s);
          cursor: pointer;
          color: var(--nb-ink-soft);
        }
        .nb-focus-queue-item:hover { background: rgba(255, 251, 244, 0.78); }
        .nb-focus-queue-item.is-active { background: rgba(243, 230, 210, 0.96); color: var(--nb-ink); }
        .nb-focus-queue-empty { color: var(--nb-ink-faint); padding: 8px 10px; }
      `}</style>

      <div className="dash-shell" style={{ gridTemplateColumns: "1fr" }}>
        <Topbar userName={user?.displayName} userEmail={user?.email} onLogout={handleLogout} />
      </div>

      <div className="nb-focus">
        <div className="nb-focus-stage">
          <HalfOpenNotebook variant="linen" width="100%" height={500}>
            <div className="nb-focus-card">
              <span className="nb-stat-label">Focus on this</span>
              <div className="nb-focus-task">
                {active ? active.title : "No task selected"}
              </div>
              <div className="nb-focus-clock" aria-live="polite">
                {formatClock(remaining)}
              </div>
              <div className="nb-focus-controls">
                {running ? (
                  <button type="button" onClick={pause}>Pause</button>
                ) : (
                  <button type="button" onClick={start} disabled={!active}>
                    {remaining === FOCUS_LEN_SEC ? "Start 25 min" : "Resume"}
                  </button>
                )}
                <button type="button" className="secondary" onClick={reset}>Reset</button>
                <button type="button" className="secondary" onClick={markDone} disabled={!active}>
                  Mark done
                </button>
              </div>
            </div>
          </HalfOpenNotebook>
        </div>

        <aside className="nb-focus-queue">
          <h3>Queue</h3>
          {queue.length === 0 ? (
            <div className="nb-focus-queue-empty">
              Nothing suggested. Add active tasks on the dashboard to populate the focus queue.
            </div>
          ) : (
            queue.map((task) => (
              <button
                key={task.id}
                type="button"
                className={`nb-focus-queue-item ${activeId === task.id ? "is-active" : ""}`}
                onClick={() => {
                  setActiveId(task.id);
                  reset();
                }}
                style={{ width: "100%", border: 0 }}
              >
                <span
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: priorityColor(task.priority),
                  }}
                />
                <span style={{ textAlign: "left", flex: 1 }}>{task.title}</span>
              </button>
            ))
          )}
        </aside>
      </div>
    </div>
  );
}
