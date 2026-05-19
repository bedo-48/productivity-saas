import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTasks, toggleTask, archiveTask } from "../services/api";
import { useAuth } from "../auth/AuthContext";
import NotebookBackdrop from "../components/NotebookBackdrop";
import Topbar from "../components/dashboard/Topbar";
import { priorityColor, type Task } from "../components/dashboard/types";
import "../components/dashboard/Dashboard.css";

type Column = "inbox" | "today" | "wip" | "done";

const COLUMNS: Array<{ id: Column; label: string; hint: string }> = [
  { id: "inbox", label: "Inbox",       hint: "No due date yet" },
  { id: "today", label: "Today",       hint: "Due today / overdue" },
  { id: "wip",   label: "In progress", hint: "Started, not done" },
  { id: "done",  label: "Done",        hint: "Wrapped up" },
];

function isSameDayOrEarlier(due: string | undefined): boolean {
  if (!due) return false;
  const today = new Date();
  const dueDate = new Date(due);
  // Compare just the date portion in the user's local zone.
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate.getTime() <= today.getTime();
}

/**
 * Without a server-side `status` column, infer one client-side from the
 * task's existing fields. Replace `columnFor` once you add a real status.
 */
function columnFor(task: Task): Column {
  if (task.completed) return "done";
  if (task.priority === "high" || isSameDayOrEarlier(task.due_date)) {
    return task.priority === "high" ? "wip" : "today";
  }
  if (!task.due_date) return "inbox";
  return "today";
}

export default function Kanban() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

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

  const grouped = useMemo(() => {
    const map: Record<Column, Task[]> = { inbox: [], today: [], wip: [], done: [] };
    for (const task of tasks) map[columnFor(task)].push(task);
    return map;
  }, [tasks]);

  async function handleToggle(taskId: number, completed: boolean) {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, completed: !completed } : task))
    );
    try {
      await toggleTask(taskId, !completed);
    } catch {
      // Revert on failure
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? { ...task, completed } : task))
      );
    }
  }

  async function handleArchive(taskId: number) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    try {
      await archiveTask(taskId);
    } catch {
      // Lazy recovery — re-fetch
      const all = await getTasks(undefined, "active");
      setTasks(all);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="dash-root">
      <NotebookBackdrop palette="light" density={28} seed={4112} />
      <style>{`
        .nb-kanban {
          width: min(100%, 1240px);
          margin: 18px auto 0;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }
        @media (max-width: 1024px) { .nb-kanban { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 600px)  { .nb-kanban { grid-template-columns: 1fr; } }
        .nb-col {
          background: rgba(249, 243, 232, 0.74);
          border: 1px solid rgba(121, 97, 81, 0.12);
          border-radius: var(--nb-radius-l);
          padding: 14px;
          min-height: 320px;
          box-shadow: var(--nb-shadow-card);
        }
        .nb-col h3 {
          margin: 0 0 4px;
          font-family: var(--nb-font-serif);
          font-size: 1.15rem;
          color: var(--nb-ink);
        }
        .nb-col .hint {
          font-size: 0.78rem;
          color: var(--nb-ink-faint);
          margin-bottom: 10px;
        }
        .nb-card {
          background: rgba(255, 251, 244, 0.92);
          border: 1px solid rgba(121, 97, 81, 0.10);
          border-radius: var(--nb-radius-m);
          padding: 10px 12px;
          margin-bottom: 10px;
          display: grid;
          gap: 6px;
        }
        .nb-card-title { font-family: var(--nb-font-hand); font-size: 1.15rem; color: var(--nb-ink); line-height: 1.18; }
        .nb-card-meta  { display: flex; gap: 10px; font-size: 0.8rem; color: var(--nb-ink-faint); }
        .nb-card-actions { display: flex; gap: 6px; }
      `}</style>

      <div className="dash-shell" style={{ gridTemplateColumns: "1fr" }}>
        <Topbar userName={user?.displayName} userEmail={user?.email} onLogout={handleLogout} />
      </div>

      <div className="nb-kanban">
        {COLUMNS.map((col) => (
          <div key={col.id} className="nb-col">
            <h3>{col.label}</h3>
            <div className="hint">{col.hint}</div>
            {loading ? (
              <>
                <div className="nb-skeleton" />
                <div className="nb-skeleton" />
              </>
            ) : grouped[col.id].length === 0 ? (
              <div className="nb-empty" style={{ padding: "12px 0" }}>
                <span className="nb-empty-mark">·</span>
                Nothing here
              </div>
            ) : (
              grouped[col.id].map((task) => (
                <div key={task.id} className="nb-card">
                  <div className="nb-card-title">{task.title}</div>
                  <div className="nb-card-meta">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: priorityColor(task.priority),
                        }}
                      />
                      {task.priority}
                    </span>
                    {task.due_date && (
                      <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
                    )}
                  </div>
                  <div className="nb-card-actions">
                    {col.id !== "done" && (
                      <button
                        className="nb-action"
                        type="button"
                        onClick={() => handleToggle(task.id, task.completed)}
                      >
                        Mark done
                      </button>
                    )}
                    <button
                      className="nb-action"
                      type="button"
                      onClick={() => handleArchive(task.id)}
                    >
                      Archive
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
