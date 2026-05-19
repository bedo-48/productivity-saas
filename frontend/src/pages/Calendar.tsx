import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTasks } from "../services/api";
import { useAuth } from "../auth/AuthContext";
import NotebookBackdrop from "../components/NotebookBackdrop";
import Topbar from "../components/dashboard/Topbar";
import { priorityColor, type Task } from "../components/dashboard/types";
import "../components/dashboard/Dashboard.css";

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarView() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await getTasks(undefined, "active");
        if (!cancelled) setTasks(all);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Bin tasks by their due_date (YYYY-MM-DD key).
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.due_date) continue;
      const key = ymd(new Date(task.due_date));
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks]);

  // Build the cells: leading empties so Monday is the first column.
  const cells = useMemo(() => {
    const first = startOfMonth(cursor.year, cursor.month);
    // JS day(): Sunday = 0, ... convert to Monday-first.
    const firstDayIdx = (first.getDay() + 6) % 7;
    const total = daysInMonth(cursor.year, cursor.month);
    const out: Array<{ key: string; day: number | null; date?: Date }> = [];
    for (let i = 0; i < firstDayIdx; i++) out.push({ key: `pad-${i}`, day: null });
    for (let d = 1; d <= total; d++) {
      const date = new Date(cursor.year, cursor.month, d);
      out.push({ key: ymd(date), day: d, date });
    }
    return out;
  }, [cursor]);

  function shiftMonth(direction: -1 | 1) {
    setCursor((c) => {
      const m = c.month + direction;
      if (m < 0) return { year: c.year - 1, month: 11 };
      if (m > 11) return { year: c.year + 1, month: 0 };
      return { year: c.year, month: m };
    });
  }

  async function handleLogout() {
    try { await logout(); } finally { navigate("/login", { replace: true }); }
  }

  const today = ymd(new Date());

  return (
    <div className="dash-root">
      <NotebookBackdrop palette="light" density={26} seed={1701} />
      <style>{`
        .nb-cal-wrap { width: min(100%, 1240px); margin: 18px auto 0; }
        .nb-cal-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 12px;
        }
        .nb-cal-title {
          font-family: var(--nb-font-serif);
          font-size: clamp(1.6rem, 2.2vw, 2rem);
          color: var(--nb-ink);
          margin: 0;
        }
        .nb-cal-nav button {
          font: inherit;
          border: 1px solid rgba(84,63,52,0.18);
          background: rgba(255,248,236,0.72);
          color: #5a463d;
          border-radius: 999px;
          padding: 6px 14px;
          margin-left: 6px;
          cursor: pointer;
        }
        .nb-cal-grid {
          background: rgba(249, 243, 232, 0.74);
          border: 1px solid rgba(121, 97, 81, 0.12);
          border-radius: var(--nb-radius-l);
          padding: 14px;
          box-shadow: var(--nb-shadow-card);
        }
        .nb-cal-weekdays, .nb-cal-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .nb-cal-weekdays { margin-bottom: 6px; }
        .nb-cal-weekdays div {
          font-size: 0.72rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--nb-ink-faint);
          padding: 6px 8px;
        }
        .nb-cal-cell {
          min-height: 92px;
          padding: 8px;
          border: 1px solid rgba(121, 97, 81, 0.10);
          background: rgba(255, 251, 244, 0.86);
          border-radius: var(--nb-radius-s);
          display: flex; flex-direction: column;
          gap: 4px;
        }
        .nb-cal-cell.empty { background: transparent; border-color: transparent; }
        .nb-cal-cell.is-today { box-shadow: inset 0 0 0 2px rgba(197,101,93,.4); }
        .nb-cal-num { font-size: 0.82rem; font-weight: 600; color: var(--nb-ink-soft); }
        .nb-cal-task {
          display: flex; align-items: center; gap: 6px;
          background: rgba(208, 143, 88, 0.10);
          border-left: 3px solid;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 0.78rem;
          color: var(--nb-ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .nb-cal-more { font-size: 0.72rem; color: var(--nb-ink-faint); }
      `}</style>

      <div className="dash-shell" style={{ gridTemplateColumns: "1fr" }}>
        <Topbar userName={user?.displayName} userEmail={user?.email} onLogout={handleLogout} />
      </div>

      <div className="nb-cal-wrap">
        <div className="nb-cal-head">
          <h1 className="nb-cal-title">
            {MONTHS[cursor.month]} {cursor.year}
          </h1>
          <div className="nb-cal-nav">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setCursor({ year: now.getFullYear(), month: now.getMonth() });
              }}
            >
              Today
            </button>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
          </div>
        </div>

        <div className="nb-cal-grid">
          <div className="nb-cal-weekdays" aria-hidden="true">
            {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="nb-cal-days">
            {loading ? (
              cells.map((cell) => (
                <div key={cell.key} className={`nb-cal-cell ${cell.day == null ? "empty" : ""}`}>
                  {cell.day != null && <div className="nb-skeleton" style={{ height: 18 }} />}
                </div>
              ))
            ) : (
              cells.map((cell) => {
                if (cell.day == null) return <div key={cell.key} className="nb-cal-cell empty" />;
                const bin = tasksByDay.get(cell.key) ?? [];
                const isToday = cell.key === today;
                return (
                  <div key={cell.key} className={`nb-cal-cell ${isToday ? "is-today" : ""}`}>
                    <div className="nb-cal-num">{cell.day}</div>
                    {bin.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="nb-cal-task"
                        style={{ borderLeftColor: priorityColor(task.priority) }}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {bin.length > 3 && (
                      <div className="nb-cal-more">+ {bin.length - 3} more</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
