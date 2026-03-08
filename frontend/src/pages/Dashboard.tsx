import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTasks, createTask, deleteTask, toggleTask } from "../services/api";
import Signature from "./Signature";

type Task = {
  id: number;
  title: string;
  completed: boolean;
  created_at?: string;
};

const floatingPhrases = [
  // TOP ROW
  { text: "Call your mom", x: "2%", y: "4%", size: 28, rotate: -12, opacity: 0.6, delay: 0 },
  { text: "buy groceries", x: "18%", y: "2%", size: 20, rotate: 4, opacity: 0.35, delay: 0.2 },
  { text: "reply to\nthat email", x: "54%", y: "3%", size: 19, rotate: -6, opacity: 0.4, delay: 0.5 },
  { text: "take out\nthe trash", x: "75%", y: "2%", size: 22, rotate: 7, opacity: 0.38, delay: 0.3 },

  // UPPER-MID
  { text: "do your\nhomework", x: "1%", y: "20%", size: 32, rotate: 8, opacity: 0.25, delay: 0.9 },
  { text: "water\nthe plants", x: "14%", y: "16%", size: 18, rotate: -4, opacity: 0.3, delay: 0.6 },
  { text: "has your\ndog eaten?", x: "78%", y: "15%", size: 22, rotate: -7, opacity: 0.5, delay: 0.7 },
  { text: "clean\nyour room", x: "64%", y: "18%", size: 17, rotate: 11, opacity: 0.3, delay: 1.2 },

  // MID LEFT / MID RIGHT
  { text: "stretch", x: "0%", y: "42%", size: 38, rotate: 13, opacity: 0.13, delay: 1.5 },
  { text: "drink\nwater", x: "4%", y: "52%", size: 20, rotate: -8, opacity: 0.38, delay: 0.4 },
  { text: "text your\ngirlfriend", x: "70%", y: "40%", size: 24, rotate: -9, opacity: 0.48, delay: 1.1 },
  { text: "call your\ndad", x: "78%", y: "55%", size: 19, rotate: 5, opacity: 0.32, delay: 0.8 },

  // LOWER-MID
  { text: "pay your\nbills", x: "1%", y: "68%", size: 26, rotate: 9, opacity: 0.3, delay: 1.4 },
  { text: "get some\nfresh air", x: "10%", y: "78%", size: 20, rotate: -5, opacity: 0.28, delay: 1.0 },
  { text: "go to sleep", x: "68%", y: "70%", size: 22, rotate: -4, opacity: 0.42, delay: 0.7 },
  { text: "charge\nyour phone", x: "76%", y: "82%", size: 18, rotate: 10, opacity: 0.35, delay: 1.3 },

  // BOTTOM ROW
  { text: "don't forget\nlunch", x: "2%", y: "88%", size: 22, rotate: -10, opacity: 0.3, delay: 0.6 },
  { text: "call your mom", x: "28%", y: "93%", size: 17, rotate: 5, opacity: 0.22, delay: 1.0 },
  { text: "floss", x: "58%", y: "90%", size: 30, rotate: -6, opacity: 0.18, delay: 1.6 },
  { text: "take your\nmeds", x: "72%", y: "94%", size: 19, rotate: 8, opacity: 0.28, delay: 0.9 },
];

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    getTasks(token)
      .then((data) => setTasks(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setAdding(true);
    try {
      const newTask = await createTask(title, token);
      setTasks((prev) => [newTask, ...prev]);
      setTitle("");
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await deleteTask(id, token);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("DELETE ERROR:", err);
    }
  };

  const handleToggle = async (id: number, completed: boolean) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await toggleTask(id, !completed, token);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
      );
    } catch (err) {
      console.error("TOGGLE ERROR:", err);
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&family=Caveat:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .dash-root {
          min-height: 100vh;
          background: #0e0e12;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          font-family: 'DM Sans', sans-serif;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .dash-root::before {
          content: '';
          position: fixed;
          top: -30%;
          left: -20%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .dash-root::after {
          content: '';
          position: fixed;
          bottom: -20%;
          right: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%);
          pointer-events: none;
        }

        /* ── Floating phrases ── */
        .floating-phrase {
          position: fixed;
          font-family: 'Caveat', cursive;
          line-height: 1.2;
          white-space: pre-line;
          pointer-events: none;
          user-select: none;
          z-index: 0;
          animation: floatDrift 6s ease-in-out infinite alternate;
        }

        @keyframes floatDrift {
          from { transform: var(--rotate) translateY(0px); }
          to   { transform: var(--rotate) translateY(-8px); }
        }

        @keyframes fadeInPhrase {
          from { opacity: 0; transform: var(--rotate) translateY(10px); }
          to   { opacity: var(--opacity); transform: var(--rotate) translateY(0); }
        }

        .floating-phrase {
          animation:
            fadeInPhrase 1s cubic-bezier(0.22,1,0.36,1) both,
            floatDrift 5s ease-in-out infinite alternate;
          animation-delay: var(--delay), var(--delay);
        }

        @media (max-width: 700px) {
          .floating-phrase { display: none; }
        }

        /* gradient text on some phrases */
        .floating-phrase.gradient {
          background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── Card ── */
        .card {
          width: 100%;
          max-width: 460px;
          background: #16161e;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 32px;
          position: relative;
          z-index: 1;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.08);
          animation: slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 28px;
        }

        .header-title {
          font-family: 'Syne', sans-serif;
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.5px;
          line-height: 1;
        }

        .header-subtitle {
          font-size: 13px;
          color: #6b6b7e;
          margin-top: 5px;
          font-weight: 300;
        }

        .logout-btn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #9898a8;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          padding: 7px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .logout-btn:hover {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.3);
          color: #f87171;
        }

        .progress-bar-wrap {
          background: rgba(255,255,255,0.05);
          border-radius: 99px;
          height: 5px;
          margin-bottom: 28px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, #6366f1, #ec4899);
          transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .progress-label {
          font-size: 12px;
          color: #55556a;
          text-align: right;
          margin-top: 6px;
          margin-bottom: 24px;
        }

        .progress-label span { color: #9898b8; }

        .form-row {
          display: flex;
          gap: 10px;
          margin-bottom: 28px;
        }

        .task-input {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 11px 14px;
          color: #e8e8f0;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }

        .task-input::placeholder { color: #45455a; }

        .task-input:focus {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.06);
        }

        .add-btn {
          padding: 11px 18px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          white-space: nowrap;
          box-shadow: 0 4px 16px rgba(99,102,241,0.3);
        }

        .add-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .add-btn:active:not(:disabled) { transform: translateY(0); }
        .add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .divider {
          height: 1px;
          background: rgba(255,255,255,0.05);
          margin-bottom: 20px;
        }

        .empty-state {
          text-align: center;
          padding: 32px 0;
          color: #45455a;
          font-size: 14px;
        }

        .empty-icon {
          font-size: 32px;
          margin-bottom: 10px;
          display: block;
          opacity: 0.4;
        }

        .task-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .task-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          transition: background 0.2s, border-color 0.2s;
          animation: fadeIn 0.25s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .task-item:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.08);
        }

        .task-item.done { background: rgba(99,102,241,0.04); }

        .checkbox {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          border: 1.5px solid rgba(255,255,255,0.15);
          flex-shrink: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          background: transparent;
        }

        .checkbox.checked {
          background: linear-gradient(135deg, #6366f1, #818cf8);
          border-color: transparent;
        }

        .checkbox.checked::after {
          content: '';
          width: 5px;
          height: 9px;
          border: 2px solid white;
          border-top: none;
          border-left: none;
          transform: rotate(45deg) translateY(-1px);
          display: block;
        }

        .task-label {
          flex: 1;
          font-size: 14px;
          color: #c8c8d8;
          cursor: pointer;
          transition: all 0.2s;
          line-height: 1.4;
        }

        .task-label.done {
          text-decoration: line-through;
          color: #45455a;
        }

        .delete-btn {
          background: none;
          border: none;
          color: #45455a;
          cursor: pointer;
          font-size: 16px;
          padding: 2px 6px;
          border-radius: 6px;
          transition: all 0.2s;
          line-height: 1;
          flex-shrink: 0;
        }

        .delete-btn:hover {
          color: #f87171;
          background: rgba(239,68,68,0.1);
        }

        .skeleton {
          background: rgba(255,255,255,0.04);
          border-radius: 10px;
          height: 46px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
      `}</style>

      <div className="dash-root">

        {/* ── Scattered background phrases ── */}
        {floatingPhrases.map((p, i) => (
          <span
            key={i}
            className={`floating-phrase${i % 4 === 0 ? " gradient" : ""}`}
            style={{
              left: p.x,
              top: p.y,
              fontSize: `${p.size}px`,
              "--rotate": `rotate(${p.rotate}deg)`,
              "--opacity": p.opacity,
              "--delay": `${p.delay}s`,
              opacity: p.opacity,
              transform: `rotate(${p.rotate}deg)`,
              color: i % 4 === 0 ? undefined : i % 3 === 0 ? "#818cf8" : "#c8c8d8",
              animationDelay: `${p.delay}s, ${p.delay}s`,
            } as React.CSSProperties}
          >
            {p.text}
          </span>
        ))}

        {/* ── Main card ── */}
        <div className="card">
          <div className="header">
            <div>
              <div className="header-title">My Tasks</div>
              <div className="header-subtitle">
                {completedCount} of {totalCount} completed
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              Sign out
            </button>
          </div>

          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-label">
            <span>{Math.round(progress)}%</span> done
          </div>

          <form className="form-row" onSubmit={handleAddTask}>
            <input
              className="task-input"
              placeholder="Add a new task..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button className="add-btn" type="submit" disabled={adding || !title.trim()}>
              {adding ? "..." : "+ Add"}
            </button>
          </form>

          <div className="divider" />

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              No tasks yet — add one above!
            </div>
          ) : (
            <div className="task-list">
              {tasks.map((task) => (
                <div key={task.id} className={`task-item${task.completed ? " done" : ""}`}>
                  <div
                    className={`checkbox${task.completed ? " checked" : ""}`}
                    onClick={() => handleToggle(task.id, task.completed)}
                  />
                  <span
                    className={`task-label${task.completed ? " done" : ""}`}
                    onClick={() => handleToggle(task.id, task.completed)}
                  >
                    {task.title}
                  </span>
                  <button
                    className="delete-btn"
                    type="button"
                    onClick={() => handleDelete(task.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Signature />
      </div>
    </>
  );
}