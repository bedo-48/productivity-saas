import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import {
  getTasks, createTask, deleteTask, toggleTask, archiveTask,
  restoreTask, shareTask, getStats, getNeglected, getSuggestions,
} from "../services/api";

const SOCKET_URL = import.meta.env.VITE_API_URL || "";

// ── Types ────────────────────────────────────────────────────
type Priority = "low" | "medium" | "high";
type Tab = "active" | "archived" | "shared";

interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  archived: boolean;
  priority: Priority;
  due_date?: string;
  created_at: string;
  updated_at?: string;
  archived_at?: string;
  owner_name?: string;
  owner_email?: string;
  permission?: string;
  collaborators?: { id: number; name: string; permission: string }[];
}

interface Stats {
  active_tasks: string;
  completed_tasks: string;
  completed_this_week: string;
  stale_tasks: string;
  avg_completion_hours: string;
}

// ── Helpers ──────────────────────────────────────────────────
function getAgeLevel(createdAt: string, completed: boolean): string {
  if (completed) return "done";
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  if (hours < 24) return "fresh";
  if (hours < 72) return "normal";
  if (hours < 168) return "aging";
  if (hours < 336) return "stale";
  return "critical";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function priorityColor(p: Priority) {
  return p === "high" ? "#f87171" : p === "medium" ? "#fbbf24" : "#34d399";
}

// ── Share Modal ──────────────────────────────────────────────
function ShareModal({ task, token, onClose }: { task: Task; token: string; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("view");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr(""); setMsg("");
    try {
      await shareTask(task.id, email, permission, token);
      setMsg(`Shared with ${email}!`);
      setEmail("");
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span>Share Task</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-task-name">"{task.title}"</div>
        {msg && <div className="share-success">{msg}</div>}
        {err && <div className="share-error">{err}</div>}
        <form onSubmit={handleShare}>
          <input
            className="share-input"
            type="email"
            placeholder="Collaborator's email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="perm-row">
            <label className={`perm-btn ${permission === "view" ? "active" : ""}`}>
              <input type="radio" value="view" checked={permission === "view"} onChange={() => setPermission("view")} style={{ display: "none" }} />
              👁 View only
            </label>
            <label className={`perm-btn ${permission === "edit" ? "active" : ""}`}>
              <input type="radio" value="edit" checked={permission === "edit"} onChange={() => setPermission("edit")} style={{ display: "none" }} />
              ✏️ Can edit
            </label>
          </div>
          <button className="share-submit" type="submit" disabled={loading || !email}>
            {loading ? "Sharing..." : "Share"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Task Card ────────────────────────────────────────────────
function TaskCard({
  task, tab, token,
  onToggle, onDelete, onArchive, onRestore, onShare,
}: {
  task: Task; tab: Tab; token: string;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  onArchive: (id: number) => void;
  onRestore: (id: number) => void;
  onShare: (task: Task) => void;
}) {
  const age = getAgeLevel(task.created_at, task.completed);
  const ageBadges: Record<string, string> = {
    fresh: "🟢 New", aging: "🟡 Getting old", stale: "🟠 Needs attention", critical: "🔴 Overdue!",
  };

  return (
    <div className={`task-card age-${age}`}>
      <div className="task-top">
        {tab === "active" && (
          <div
            className={`checkbox ${task.completed ? "checked" : ""}`}
            onClick={() => onToggle(task.id, task.completed)}
          />
        )}
        <div className="task-body">
          <span className={`task-title ${task.completed ? "done" : ""}`}>{task.title}</span>
          {task.description && <span className="task-desc">{task.description}</span>}
          <div className="task-meta">
            <span className="priority-dot" style={{ background: priorityColor(task.priority) }} />
            <span className="meta-text">{task.priority}</span>
            <span className="meta-sep">·</span>
            <span className="meta-text">{timeAgo(task.created_at)}</span>
            {task.due_date && (
              <>
                <span className="meta-sep">·</span>
                <span className="meta-text">Due {new Date(task.due_date).toLocaleDateString()}</span>
              </>
            )}
            {tab === "shared" && task.owner_name && (
              <>
                <span className="meta-sep">·</span>
                <span className="meta-text">By {task.owner_name}</span>
              </>
            )}
          </div>
        </div>
        <div className="task-actions">
          {ageBadges[age] && <span className="age-badge">{ageBadges[age]}</span>}
          {tab === "active" && (
            <>
              <button className="action-btn share-btn" title="Share" onClick={() => onShare(task)}>⇗</button>
              <button className="action-btn" title="Archive" onClick={() => onArchive(task.id)}>📦</button>
            </>
          )}
          {tab === "archived" && (
            <button className="action-btn" title="Restore" onClick={() => onRestore(task.id)}>↩</button>
          )}
          {tab !== "shared" && (
            <button className="action-btn delete-action" title="Delete" onClick={() => onDelete(task.id)}>✕</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Productivity Panel ───────────────────────────────────────
function ProductivityPanel({
  stats, neglected, suggestions, loading,
}: {
  stats: Stats | null; neglected: Task[]; suggestions: Task[]; loading: boolean;
}) {
  const [open, setOpen] = useState(true);
  if (loading) return <div className="panel-loading">Loading insights...</div>;
  if (!stats) return null;

  const active = Number(stats.active_tasks);
  const completed = Number(stats.completed_tasks);
  const rate = active + completed > 0 ? Math.round((completed / (active + completed)) * 100) : 0;

  return (
    <div className="productivity-panel">
      <button className="panel-toggle" onClick={() => setOpen((o) => !o)}>
        📊 Productivity Insights {open ? "▲" : "▼"}
      </button>
      {open && (
        <>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-num">{stats.active_tasks}</div><div className="stat-label">Active</div></div>
            <div className="stat-card"><div className="stat-num">{stats.completed_this_week}</div><div className="stat-label">Done this week</div></div>
            <div className="stat-card"><div className="stat-num">{rate}%</div><div className="stat-label">Completion rate</div></div>
            <div className="stat-card"><div className="stat-num">{Math.round(Number(stats.avg_completion_hours))}h</div><div className="stat-label">Avg. completion</div></div>
          </div>

          {neglected.length > 0 && (
            <div className="insight-block warning">
              <div className="insight-title">⚠️ Needs attention — {neglected.length} stale task{neglected.length > 1 ? "s" : ""}</div>
              <ul className="insight-list">
                {neglected.map((t) => (
                  <li key={t.id}>{t.title} <span className="insight-age">({timeAgo(t.created_at)})</span></li>
                ))}
              </ul>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="insight-block info">
              <div className="insight-title">💡 Suggested focus for today</div>
              <ol className="insight-list">
                {suggestions.map((t) => (
                  <li key={t.id}>
                    {t.title}
                    <span className="priority-dot small" style={{ background: priorityColor(t.priority), marginLeft: 6 }} />
                    {t.due_date && <span className="insight-age"> · due {new Date(t.due_date).toLocaleDateString()}</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────
export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<Tab>("active");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [shareTarget, setShareTarget] = useState<Task | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [neglected, setNeglected] = useState<Task[]>([]);
  const [suggestions, setSuggestions] = useState<Task[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";
  const socketRef = useRef<Socket | null>(null);

  const loadTasks = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      const data = await getTasks(token, t);
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const [s, n, sg] = await Promise.all([getStats(token), getNeglected(token), getSuggestions(token)]);
      setStats(s);
      setNeglected(n);
      setSuggestions(sg);
    } catch (err) {
      console.error(err);
    } finally {
      setInsightsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) { navigate("/"); return; }
    loadInsights();

    // ── Socket.IO real-time connection ──
    const socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("task:updated", ({ task }: { task: Task }) => {
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, ...task } : t));
    });

    socket.on("task:deleted", ({ taskId }: { taskId: number }) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    });

    socket.on("task:shared", () => {
      // Someone shared a task with me — refresh shared tab if active
      loadTasks("shared");
      loadInsights();
    });

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    loadTasks(tab);
  }, [tab]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    try {
      const newTask = await createTask(title, token, { priority });
      setTasks((prev) => [newTask, ...prev]);
      setTitle("");
      loadInsights();
    } catch (err) { console.error(err); }
    finally { setAdding(false); }
  };

  const handleToggle = async (id: number, completed: boolean) => {
    try {
      await toggleTask(id, !completed, token);
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: !completed } : t));
      loadInsights();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTask(id, token);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      loadInsights();
    } catch (err) { console.error(err); }
  };

  const handleArchive = async (id: number) => {
    try {
      await archiveTask(id, token);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      loadInsights();
    } catch (err) { console.error(err); }
  };

  const handleRestore = async (id: number) => {
    try {
      await restoreTask(id, token);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      loadInsights();
    } catch (err) { console.error(err); }
  };

  const activeTasks = tasks.filter((t) => !t.completed);
  const doneTasks = tasks.filter((t) => t.completed);
  const progress = tasks.length > 0 ? (doneTasks.length / tasks.length) * 100 : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0e0e12; }

        .dash-root {
          min-height: 100vh; background: #0e0e12; font-family: 'DM Sans', sans-serif;
          display: flex; flex-direction: column; align-items: center; padding: 24px 16px 48px;
        }
        .dash-root::before {
          content:''; position:fixed; top:-30%; left:-20%; width:600px; height:600px;
          background:radial-gradient(circle,rgba(99,102,241,.15) 0%,transparent 70%);
          pointer-events:none; z-index:0;
        }

        /* ── Topbar ── */
        .topbar {
          width: 100%; max-width: 720px; display: flex; align-items: center;
          justify-content: space-between; margin-bottom: 24px; position: relative; z-index: 1;
        }
        .topbar-logo { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #fff; }
        .topbar-logo span { color: #6366f1; }
        .logout-btn {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          color: #9898a8; font-family: 'DM Sans', sans-serif; font-size: 13px;
          padding: 7px 14px; border-radius: 8px; cursor: pointer; transition: all .2s;
        }
        .logout-btn:hover { background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.3); color: #f87171; }

        /* ── Productivity Panel ── */
        .productivity-panel {
          width: 100%; max-width: 720px; background: #16161e;
          border: 1px solid rgba(255,255,255,0.07); border-radius: 16px;
          padding: 20px; margin-bottom: 20px; position: relative; z-index: 1;
        }
        .panel-toggle {
          background: none; border: none; color: #9898a8; font-size: 13px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 0;
          font-family: 'DM Sans', sans-serif; transition: color .2s; width: 100%;
        }
        .panel-toggle:hover { color: #fff; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
        @media (max-width: 500px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
        .stat-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; padding: 14px; text-align: center;
        }
        .stat-num { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800; color: #fff; }
        .stat-label { font-size: 11px; color: #55556a; margin-top: 4px; text-transform: uppercase; letter-spacing: .5px; }
        .insight-block {
          border-radius: 10px; padding: 14px 16px; margin-top: 14px; border-left: 3px solid;
        }
        .insight-block.warning { background: rgba(251,191,36,.05); border-color: #fbbf24; }
        .insight-block.info { background: rgba(99,102,241,.05); border-color: #6366f1; }
        .insight-title { font-size: 13px; font-weight: 600; color: #c8c8d8; margin-bottom: 8px; }
        .insight-list { padding-left: 18px; color: #9898a8; font-size: 13px; display: flex; flex-direction: column; gap: 4px; }
        .insight-age { color: #55556a; }
        .panel-loading { width: 100%; max-width: 720px; color: #45455a; font-size: 13px; margin-bottom: 20px; text-align: center; }

        /* ── Main card ── */
        .card {
          width: 100%; max-width: 720px; background: #16161e;
          border: 1px solid rgba(255,255,255,0.07); border-radius: 20px;
          padding: 28px 28px 24px; position: relative; z-index: 1;
          box-shadow: 0 24px 60px rgba(0,0,0,.5);
          animation: slideUp .4s cubic-bezier(.22,1,.36,1);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Tabs ── */
        .tabs { display: flex; gap: 6px; margin-bottom: 24px; }
        .tab-btn {
          padding: 7px 16px; border-radius: 99px; border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03); color: #6b6b7e;
          font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: all .2s;
        }
        .tab-btn.active {
          background: rgba(99,102,241,.15); border-color: rgba(99,102,241,.4); color: #a5b4fc;
        }
        .tab-btn:hover:not(.active) { background: rgba(255,255,255,.05); color: #c8c8d8; }
        .tab-count {
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(99,102,241,.2); color: #818cf8; border-radius: 99px;
          font-size: 10px; font-weight: 700; padding: 1px 6px; margin-left: 6px;
        }

        /* ── Progress ── */
        .progress-bar-wrap {
          background: rgba(255,255,255,.05); border-radius: 99px; height: 4px;
          margin-bottom: 6px; overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%; border-radius: 99px;
          background: linear-gradient(90deg, #6366f1, #ec4899);
          transition: width .5s cubic-bezier(.22,1,.36,1);
        }
        .progress-label { font-size: 11px; color: #45455a; text-align: right; margin-bottom: 20px; }
        .progress-label span { color: #9898b8; }

        /* ── Form ── */
        .form-row { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
        .task-input {
          flex: 1; min-width: 180px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
          border-radius: 10px; padding: 11px 14px; color: #e8e8f0;
          font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; transition: all .2s;
        }
        .task-input::placeholder { color: #45455a; }
        .task-input:focus { border-color: rgba(99,102,241,.5); background: rgba(99,102,241,.06); }
        .priority-select {
          background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
          border-radius: 10px; padding: 11px 12px; color: #9898a8;
          font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none; cursor: pointer;
        }
        .priority-select option { background: #16161e; }
        .add-btn {
          padding: 11px 18px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #6366f1, #818cf8); color: white;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
          cursor: pointer; transition: opacity .2s, transform .15s; white-space: nowrap;
          box-shadow: 0 4px 16px rgba(99,102,241,.3);
        }
        .add-btn:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
        .add-btn:disabled { opacity: .5; cursor: not-allowed; }

        /* ── Task cards ── */
        .task-list { display: flex; flex-direction: column; gap: 8px; }
        .task-card {
          border-radius: 12px; padding: 14px 16px;
          background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.05);
          border-left: 4px solid transparent; transition: all .25s;
          animation: fadeIn .2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .task-card:hover { background: rgba(255,255,255,.04); }
        .task-card.age-fresh { border-left-color: #10b981; }
        .task-card.age-normal { border-left-color: #6b7280; }
        .task-card.age-aging  { border-left-color: #f59e0b; }
        .task-card.age-stale  { border-left-color: #f97316; }
        .task-card.age-critical {
          border-left-color: #ef4444;
          animation: fadeIn .2s ease, pulse-red 2s 1s infinite;
        }
        @keyframes pulse-red {
          0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,.2); }
          50%      { box-shadow: 0 0 0 6px rgba(239,68,68,.0); }
        }
        .task-card.age-done { border-left-color: rgba(99,102,241,.3); opacity: .65; }

        .task-top { display: flex; align-items: flex-start; gap: 12px; }
        .checkbox {
          width: 20px; height: 20px; border-radius: 6px; border: 1.5px solid rgba(255,255,255,.15);
          flex-shrink: 0; cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all .2s; background: transparent; margin-top: 2px;
        }
        .checkbox.checked {
          background: linear-gradient(135deg, #6366f1, #818cf8); border-color: transparent;
        }
        .checkbox.checked::after {
          content: ''; width: 5px; height: 9px; border: 2px solid white;
          border-top: none; border-left: none; transform: rotate(45deg) translateY(-1px); display: block;
        }
        .task-body { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .task-title { font-size: 14px; color: #c8c8d8; line-height: 1.4; transition: all .2s; }
        .task-title.done { text-decoration: line-through; color: #45455a; }
        .task-desc { font-size: 12px; color: #55556a; }
        .task-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .priority-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
        }
        .priority-dot.small { width: 6px; height: 6px; display: inline-block; border-radius: 50%; vertical-align: middle; }
        .meta-text { font-size: 11px; color: #45455a; }
        .meta-sep { color: #2a2a38; font-size: 11px; }

        .task-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .age-badge { font-size: 10px; color: #9898a8; white-space: nowrap; margin-right: 4px; }
        .action-btn {
          background: none; border: none; color: #45455a; cursor: pointer;
          font-size: 14px; padding: 4px 6px; border-radius: 6px; transition: all .2s; line-height: 1;
        }
        .action-btn:hover { color: #c8c8d8; background: rgba(255,255,255,.06); }
        .share-btn:hover { color: #818cf8; background: rgba(99,102,241,.1); }
        .delete-action:hover { color: #f87171; background: rgba(239,68,68,.1); }

        .divider { height: 1px; background: rgba(255,255,255,.05); margin-bottom: 20px; }
        .empty-state { text-align: center; padding: 40px 0; color: #45455a; font-size: 14px; }
        .empty-icon { font-size: 36px; margin-bottom: 10px; display: block; opacity: .4; }
        .skeleton { background: rgba(255,255,255,.04); border-radius: 10px; height: 56px; animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity: .4; } 50% { opacity: .8; } }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.7); backdrop-filter: blur(4px);
          z-index: 100; display: flex; align-items: center; justify-content: center; padding: 24px;
        }
        .modal-box {
          background: #1a1a24; border: 1px solid rgba(255,255,255,.1);
          border-radius: 16px; padding: 28px; width: 100%; max-width: 380px;
          animation: slideUp .3s ease;
        }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; color: #fff; font-weight: 600; font-size: 15px; }
        .modal-close { background: none; border: none; color: #6b6b7e; cursor: pointer; font-size: 16px; transition: color .2s; }
        .modal-close:hover { color: #fff; }
        .modal-task-name { font-size: 13px; color: #6b6b7e; margin-bottom: 20px; }
        .share-input {
          width: 100%; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
          border-radius: 10px; padding: 11px 14px; color: #e8e8f0; font-size: 14px;
          outline: none; margin-bottom: 12px; font-family: 'DM Sans', sans-serif;
        }
        .perm-row { display: flex; gap: 8px; margin-bottom: 16px; }
        .perm-btn {
          flex: 1; padding: 9px; border: 1px solid rgba(255,255,255,.08);
          border-radius: 8px; text-align: center; font-size: 13px; color: #6b6b7e;
          cursor: pointer; transition: all .2s; background: rgba(255,255,255,.02);
        }
        .perm-btn.active { border-color: rgba(99,102,241,.5); background: rgba(99,102,241,.1); color: #a5b4fc; }
        .share-submit {
          width: 100%; padding: 12px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #6366f1, #818cf8); color: #fff;
          font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity .2s;
          font-family: 'DM Sans', sans-serif;
        }
        .share-submit:disabled { opacity: .5; cursor: not-allowed; }
        .share-success { color: #34d399; font-size: 13px; margin-bottom: 12px; }
        .share-error { color: #f87171; font-size: 13px; margin-bottom: 12px; }
      `}</style>

      <div className="dash-root">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-logo">Task<span>Flow</span></div>
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>

        {/* Productivity Panel */}
        <ProductivityPanel
          stats={stats}
          neglected={neglected}
          suggestions={suggestions}
          loading={insightsLoading}
        />

        {/* Main Card */}
        <div className="card">
          {/* Tabs */}
          <div className="tabs">
            {(["active", "archived", "shared"] as Tab[]).map((t) => (
              <button
                key={t}
                className={`tab-btn ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "active" ? "My Tasks" : t === "archived" ? "Archive" : "Shared"}
                {t === "active" && tasks.length > 0 && (
                  <span className="tab-count">{activeTasks.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Progress (active only) */}
          {tab === "active" && tasks.length > 0 && (
            <>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="progress-label">
                <span>{doneTasks.length}/{tasks.length}</span> completed · <span>{Math.round(progress)}%</span>
              </div>
            </>
          )}

          {/* Add task form (active tab only) */}
          {tab === "active" && (
            <form className="form-row" onSubmit={handleAddTask}>
              <input
                className="task-input"
                placeholder="Add a new task..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <select
                className="priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
              <button className="add-btn" type="submit" disabled={adding || !title.trim()}>
                {adding ? "..." : "+ Add"}
              </button>
            </form>
          )}

          <div className="divider" />

          {/* Task list */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" />)}
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">
                {tab === "active" ? "📋" : tab === "archived" ? "📦" : "🤝"}
              </span>
              {tab === "active" && "No tasks yet — add one above!"}
              {tab === "archived" && "No archived tasks."}
              {tab === "shared" && "No tasks shared with you yet."}
            </div>
          ) : (
            <div className="task-list">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  tab={tab}
                  token={token}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onArchive={handleArchive}
                  onRestore={handleRestore}
                  onShare={setShareTarget}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareTarget && (
        <ShareModal
          task={shareTarget}
          token={token}
          onClose={() => setShareTarget(null)}
        />
      )}
    </>
  );
}
