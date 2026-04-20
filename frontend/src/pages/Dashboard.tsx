import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  archiveTask,
  createTask,
  deleteTask,
  getActivityLog,
  getNeglected,
  getStats,
  getSuggestions,
  getTasks,
  restoreTask,
  shareTask,
  toggleTask,
} from "../services/api";
import { useAuth } from "../auth/AuthContext";
import { getFreshIdToken } from "../services/firebase";

const SOCKET_URL = import.meta.env.VITE_API_URL || "";
const USE_MOCK_DASHBOARD = !SOCKET_URL;
const COMPLETE_STRIKE_MS = 700;
const COMPLETE_FADE_MS = 850;
const DELETE_FADE_MS = 320;
const PENCIL_ANIMATION_MS = 900;

const DASHBOARD_STYLES = String.raw`
@import url("https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,600&family=Patrick+Hand&family=Manrope:wght@400;500;600;700&display=swap");
.dash-root{min-height:100vh;padding:28px 16px 56px;font-family:"Manrope",sans-serif;color:#3e342d;background:radial-gradient(circle at top left,rgba(196,177,145,.3),transparent 34%),radial-gradient(circle at right 18%,rgba(143,170,173,.18),transparent 28%),linear-gradient(180deg,#e7dcc7 0%,#d8c7ab 100%)}
.dash-root *{box-sizing:border-box}.topbar,.productivity-panel,.dashboard-shell{width:min(100%,1180px);margin:0 auto}.topbar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:18px}.topbar-kicker,.notebook-kicker{margin:0 0 4px;font-size:.74rem;letter-spacing:.18em;text-transform:uppercase;color:#8b6e63}.topbar-logo{font-family:"Newsreader",serif;font-size:clamp(2rem,3vw,2.6rem);line-height:1;color:#483931}.logout-btn,.panel-toggle,.nav-link,.task-action,.add-btn,.share-submit,.modal-close,.task-check{font:inherit}.logout-btn{border:1px solid rgba(84,63,52,.18);background:rgba(255,248,236,.72);color:#5a463d;border-radius:999px;padding:10px 16px;cursor:pointer;box-shadow:0 10px 20px rgba(83,58,36,.08)}
.productivity-panel,.dashboard-menu{border-radius:28px;padding:22px;border:1px solid rgba(121,97,81,.12);background:rgba(249,243,232,.74);box-shadow:0 16px 34px rgba(115,92,69,.12);backdrop-filter:blur(10px)}.productivity-panel{margin-bottom:24px}.panel-toggle{width:100%;display:flex;justify-content:space-between;align-items:center;border:0;background:transparent;color:#6b564a;padding:0;cursor:pointer;font-weight:600}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:18px}.stat-card,.activity-card,.section-card{border-radius:18px;padding:16px;background:rgba(255,251,244,.82);border:1px solid rgba(121,97,81,.08)}.stat-num{font-family:"Newsreader",serif;font-size:2rem;line-height:1}.stat-label{margin-top:6px;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:#877265}.insight-block{margin-top:14px;padding:14px 16px;border-radius:16px;border-left:3px solid}.insight-block.warning{background:rgba(232,203,151,.26);border-left-color:#c89c53}.insight-block.info{background:rgba(168,192,198,.18);border-left-color:#78939b}.insight-title{margin-bottom:8px;font-weight:700;color:#59463d}.insight-list{margin:0;padding-left:18px;display:grid;gap:6px;color:#685349}.insight-age{margin-left:6px;color:#8c7568}.panel-loading{width:min(100%,1180px);margin:0 auto 24px;color:#7d685c}
.dashboard-shell{display:grid;grid-template-columns:240px minmax(0,1fr);gap:22px;align-items:start}.dashboard-menu{position:sticky;top:28px}.menu-title{font-family:"Newsreader",serif;font-size:1.4rem;margin-bottom:8px}.menu-copy,.section-copy{color:#7c675a;line-height:1.55}.menu-copy{font-size:.95rem;margin-bottom:18px}.menu-nav{display:grid;gap:10px}.nav-link{border:1px solid rgba(109,84,68,.12);background:rgba(255,251,244,.82);color:#6a5446;padding:14px;border-radius:20px;cursor:pointer;text-align:left}.nav-link.active{background:rgba(243,230,210,.96);box-shadow:0 10px 18px rgba(112,87,62,.1)}.nav-link-title{font-weight:700;color:#4a3a31}.nav-link-sub{margin-top:4px;font-size:.84rem;color:#7f695d}.menu-pill-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.menu-pill{display:inline-flex;border-radius:999px;padding:7px 10px;background:rgba(208,143,88,.14);color:#87562f;font-size:.8rem}
.notebook-panel{display:grid;grid-template-columns:96px minmax(0,1fr);gap:18px}.pencil-decoration{position:sticky;top:36px;display:flex;justify-content:center;padding-top:42px}.pencil{position:relative;width:24px;height:240px;transform:rotate(18deg);filter:drop-shadow(0 18px 18px rgba(102,75,52,.18))}.pencil-shadow{position:absolute;inset:56px 24px 0;border-radius:999px;background:rgba(72,57,49,.08);filter:blur(14px)}.pencil-eraser,.pencil-band,.pencil-body,.pencil-tip,.pencil-lead{position:absolute;left:50%;transform:translateX(-50%);display:block}.pencil-eraser{top:0;width:18px;height:22px;background:linear-gradient(180deg,#f0a7a6,#d68483);border-radius:10px 10px 6px 6px}.pencil-band{top:20px;width:20px;height:14px;background:linear-gradient(180deg,#d2d5d9,#aab0b8)}.pencil-body{top:34px;width:18px;height:168px;border-radius:10px;background:linear-gradient(180deg,#f3ca67,#d99f2b)}.pencil-tip{bottom:18px;width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-top:28px solid #c49d72}.pencil-lead{bottom:0;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:18px solid #57453b}.pencil-decoration.is-writing .pencil{animation:pencil-sweep .9s cubic-bezier(.22,1,.36,1)}@keyframes pencil-sweep{0%{transform:translate(-4px,0) rotate(18deg)}35%{transform:translate(26px,8px) rotate(12deg)}75%{transform:translate(10px,-2px) rotate(20deg)}100%{transform:translate(0,0) rotate(18deg)}}
.notebook-page{position:relative;overflow:hidden;border-radius:32px;padding:34px 28px 36px 72px;min-height:72vh;background:linear-gradient(180deg,rgba(255,252,245,.96),rgba(248,240,226,.95)),repeating-linear-gradient(180deg,rgba(116,157,197,0) 0,rgba(116,157,197,0) 39px,rgba(116,157,197,.2) 39px,rgba(116,157,197,.2) 41px);border:1px solid rgba(106,84,71,.12);box-shadow:0 24px 60px rgba(109,85,58,.18),inset 0 1px 0 rgba(255,255,255,.7)}.notebook-page::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.3),transparent 20%),repeating-linear-gradient(180deg,transparent 0,transparent 39px,rgba(116,157,197,.15) 39px,rgba(116,157,197,.15) 41px);pointer-events:none}.notebook-margin{position:absolute;top:0;bottom:0;left:48px;width:2px;background:linear-gradient(180deg,rgba(205,94,111,.45),rgba(205,94,111,.75),rgba(205,94,111,.45))}.notebook-header,.form-row,.progress-block,.task-list,.empty-state,.divider,.activity-feed,.section-card{position:relative;z-index:1}.notebook-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px}.notebook-header h1{margin:0;font-family:"Newsreader",serif;font-size:clamp(2.1rem,4vw,3.4rem);line-height:.95;color:#49362d}.section-copy{max-width:420px;margin-top:8px}.progress-block{margin-bottom:18px}.progress-bar-wrap{width:100%;height:6px;border-radius:999px;background:rgba(111,148,182,.2);overflow:hidden}.progress-bar-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#d1a15c,#d67f72);transition:width .4s ease}.progress-label{margin-top:8px;color:#7f695d;font-size:.95rem}.progress-label span{color:#4a3a31;font-weight:700}.form-row{display:grid;grid-template-columns:minmax(0,1fr) 180px auto;gap:12px;margin-bottom:18px}.task-input,.priority-select,.share-input{border:1px solid rgba(107,82,66,.14);background:rgba(255,251,244,.86);color:#4d3b31;border-radius:16px;padding:14px 16px;outline:none}.task-input::placeholder,.share-input::placeholder{color:#9b877b}.add-btn,.share-submit{border:0;border-radius:16px;background:linear-gradient(135deg,#d08f58,#c5655d);color:#fffaf4;padding:14px 18px;cursor:pointer;box-shadow:0 14px 24px rgba(169,99,69,.18)}.add-btn:disabled,.share-submit:disabled{opacity:.6;cursor:not-allowed}.divider{height:1px;background:linear-gradient(90deg,rgba(121,97,81,.05),rgba(121,97,81,.22),rgba(121,97,81,.05));margin-bottom:8px}
.task-list,.activity-feed{display:grid;gap:0}.task-paper,.skeleton{min-height:82px}.task-paper{position:relative;padding:14px 0 16px;border-bottom:1px solid rgba(102,141,178,.18);transition:opacity .28s ease,transform .28s ease,filter .28s ease}.task-paper::before{content:"";position:absolute;left:-26px;top:22px;width:10px;height:10px;border-radius:50%;background:rgba(207,180,152,.58)}.task-line{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:start}.task-check{margin-top:5px;width:20px;height:20px;border-radius:50%;border:1.5px solid rgba(120,95,79,.5);background:rgba(255,250,242,.72);cursor:pointer}.task-check.checked{background:radial-gradient(circle at 50% 50%,#c5655d 0 45%,rgba(197,101,93,.16) 46% 100%);border-color:#c5655d}.task-body{min-width:0}.task-title-wrap{position:relative;display:inline-block;max-width:100%}.task-title-text{display:inline-block;max-width:100%;font-family:"Patrick Hand",cursive;font-size:clamp(1.35rem,2vw,1.6rem);line-height:1.15;color:#3f3028;word-break:break-word}.task-strike{position:absolute;left:-2px;right:-2px;top:55%;height:1.5px;border-radius:999px;background:#7d5d4b;transform:scaleX(0);transform-origin:left center;opacity:0}.task-desc{margin-top:4px;display:block;color:#7c675a}.task-meta{margin-top:8px;display:flex;flex-wrap:wrap;gap:8px 14px;font-size:.86rem;color:#846e61}.priority-chip{display:inline-flex;align-items:center;gap:7px;text-transform:capitalize}.priority-dot{width:8px;height:8px;border-radius:50%;display:inline-block}.priority-dot.small{margin-left:8px}.task-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;align-items:center;max-width:240px}.task-age{font-size:.78rem;color:#8d786b}.task-action{border:0;background:rgba(240,229,211,.7);color:#6c5547;border-radius:999px;padding:8px 12px;cursor:pointer}.delete-action:hover{background:rgba(216,111,100,.16);color:#9f4039}.task-paper.is-new .task-title-text{animation:task-write-in .9s cubic-bezier(.22,1,.36,1)}.task-paper.is-new::after{content:"";position:absolute;left:34px;right:170px;top:20px;height:24px;background:linear-gradient(90deg,rgba(241,207,145,.36),rgba(241,207,145,0));animation:ink-sheen .95s ease-out}.task-paper.is-completing .task-strike{opacity:1;animation:strike-through .7s ease forwards}.task-paper.is-completing .task-title-text{color:#8f7b6e}.task-paper.is-exiting{opacity:0;filter:blur(2px);transform:translateX(16px) translateY(8px)}@keyframes task-write-in{0%{opacity:0;transform:translateY(8px) scale(.98);clip-path:inset(0 100% 0 0)}55%{opacity:1;clip-path:inset(0 12% 0 0)}100%{opacity:1;transform:translateY(0) scale(1);clip-path:inset(0 0 0 0)}}@keyframes ink-sheen{0%{opacity:0;transform:translateX(-24px)}30%{opacity:1}100%{opacity:0;transform:translateX(42px)}}@keyframes strike-through{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}.activity-card{margin-bottom:12px}.activity-title{font-weight:700;color:#4a3a31}.activity-meta{margin-top:6px;color:#80695d;font-size:.92rem}.activity-badge{display:inline-flex;margin-top:10px;border-radius:999px;padding:6px 10px;background:rgba(208,143,88,.14);color:#87562f;font-size:.8rem;text-transform:capitalize}.empty-state{text-align:center;padding:42px 0 18px;color:#816a5e}.empty-icon{display:block;margin-bottom:10px;font-family:"Patrick Hand",cursive;font-size:2rem;color:#ae9385}.skeleton{border-radius:18px;background:linear-gradient(90deg,rgba(255,251,244,.4),rgba(245,236,221,.86),rgba(255,251,244,.4));background-size:220% 100%;animation:skeleton-pulse 1.3s ease infinite}@keyframes skeleton-pulse{0%{background-position:100% 0}100%{background-position:-100% 0}}
.modal-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(68,48,34,.32);backdrop-filter:blur(8px);z-index:20}.modal-box{width:min(100%,420px);padding:28px;border-radius:28px;background:#fbf5eb;border:1px solid rgba(106,84,71,.12);box-shadow:0 24px 50px rgba(95,69,52,.16)}.modal-header{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:8px;font-family:"Newsreader",serif;font-size:1.5rem}.modal-close{width:34px;height:34px;border:0;border-radius:50%;background:rgba(121,97,81,.08);color:#5f4a3f;cursor:pointer}.modal-task-name{margin-bottom:18px;color:#80695d}.perm-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}.perm-btn{border-radius:16px;padding:12px;border:1px solid rgba(106,84,71,.12);background:rgba(255,251,244,.78);color:#715b4e;cursor:pointer;text-align:center}.perm-btn.active{border-color:rgba(197,101,93,.4);background:rgba(245,222,216,.6)}.share-success,.share-error{margin-bottom:12px}.share-success{color:#52715c}.share-error{color:#a34b45}
@media (max-width:980px){.dashboard-shell{grid-template-columns:1fr}.dashboard-menu{position:relative;top:0}.notebook-panel{grid-template-columns:1fr}.pencil-decoration{position:relative;top:0;justify-content:flex-start;padding:0 0 6px 18px}.pencil{height:120px;transform:rotate(76deg)}}@media (max-width:720px){.stats-grid,.form-row,.task-line{grid-template-columns:1fr}.notebook-page{padding:28px 18px 26px 50px}.notebook-margin{left:30px}.task-paper::before{left:-15px}.task-actions{justify-content:flex-start;max-width:none}.topbar,.notebook-header{flex-direction:column;align-items:flex-start}}@media (max-width:520px){.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.perm-row{grid-template-columns:1fr}}
`;

type Priority = "low" | "medium" | "high";
type Section = "active" | "shared" | "past" | "activity";
type TaskExitState = "completing" | "deleting" | "archiving" | "restoring";

interface Task { id: number; title: string; description?: string; completed: boolean; archived: boolean; priority: Priority; due_date?: string; created_at: string; updated_at?: string; archived_at?: string; owner_name?: string; owner_email?: string; permission?: string; collaborators?: { id: number; name: string; permission: string }[]; }
interface Stats { active_tasks: string; completed_tasks: string; completed_this_week: string; stale_tasks: string; avg_completion_hours: string; }
interface ActivityItem { id: number; task_id: number; task_title: string; action: string; actor_name: string; details?: Record<string, unknown> | null; created_at: string; }
interface TaskCardProps { task: Task; section: Section; isNew: boolean; isCompleting: boolean; isExiting: boolean; onToggle: (id: number, completed: boolean) => void; onDelete: (id: number) => void; onArchive: (id: number) => void; onRestore: (id: number) => void; onShare: (task: Task) => void; }

const MENU_ITEMS: Array<{ section: Section; label: string; description: string; path: string }> = [
  { section: "active", label: "Active Tasks", description: "Current work and writing flow.", path: "/dashboard" },
  { section: "shared", label: "Shared Tasks", description: "Tasks shared with you.", path: "/dashboard/shared" },
  { section: "past", label: "Past Tasks", description: "Archived notes and older work.", path: "/dashboard/past" },
  { section: "activity", label: "Track Activities", description: "Recent task actions and history.", path: "/dashboard/activity" },
];

function getSection(pathname: string): Section { if (pathname.endsWith("/shared")) return "shared"; if (pathname.endsWith("/past")) return "past"; if (pathname.endsWith("/activity")) return "activity"; return "active"; }
function getSectionCopy(section: Section) { if (section === "shared") return { kicker: "Collaboration", title: "Shared tasks at a glance", description: "Stay oriented on work others have handed over or invited you into." }; if (section === "past") return { kicker: "Archive", title: "Past work, neatly tucked away", description: "Review archived notes, restore them, or clear them out when they are no longer useful." }; if (section === "activity") return { kicker: "History", title: "Track what happened recently", description: "See task changes, completions, shares, and restores in one lightweight activity stream." }; return { kicker: "Daily dashboard", title: "Write it down. Clear the page.", description: "Keep active work on a notebook page, add the next task quickly, and cross things off with momentum." }; }
function getAgeLevel(createdAt: string, completed: boolean): string { if (completed) return "done"; const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000; if (hours < 24) return "fresh"; if (hours < 72) return "normal"; if (hours < 168) return "aging"; if (hours < 336) return "stale"; return "critical"; }
function timeAgo(dateStr: string): string { const diff = Date.now() - new Date(dateStr).getTime(); const days = Math.floor(diff / 86400000); const hours = Math.floor(diff / 3600000); const minutes = Math.floor(diff / 60000); if (days > 0) return `${days}d ago`; if (hours > 0) return `${hours}h ago`; if (minutes > 0) return `${minutes}m ago`; return "just now"; }
function priorityColor(priority: Priority) { return priority === "high" ? "#cc6b5f" : priority === "medium" ? "#c89c53" : "#6d9478"; }
function getErrorMessage(error: unknown) { return error instanceof Error ? error.message : "Something went wrong"; }
function ShareModal({ task, token, onClose }: { task: Task; token: string; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("view");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleShare = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true); setErrorMessage(""); setMessage("");
    try { await shareTask(task.id, email, permission, token); setMessage(`Shared with ${email}.`); setEmail(""); }
    catch (error) { setErrorMessage(getErrorMessage(error)); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header"><span>Share Task</span><button className="modal-close" type="button" onClick={onClose} aria-label="Close share dialog">x</button></div>
        <div className="modal-task-name">&quot;{task.title}&quot;</div>
        {message && <div className="share-success">{message}</div>}
        {errorMessage && <div className="share-error">{errorMessage}</div>}
        <form onSubmit={handleShare}>
          <input className="share-input" type="email" placeholder="Collaborator email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <div className="perm-row">
            <label className={`perm-btn ${permission === "view" ? "active" : ""}`}><input type="radio" value="view" checked={permission === "view"} onChange={() => setPermission("view")} hidden />View only</label>
            <label className={`perm-btn ${permission === "edit" ? "active" : ""}`}><input type="radio" value="edit" checked={permission === "edit"} onChange={() => setPermission("edit")} hidden />Can edit</label>
          </div>
          <button className="share-submit" type="submit" disabled={loading || !email.trim()}>{loading ? "Sharing..." : "Share"}</button>
        </form>
      </div>
    </div>
  );
}

function TaskCard({ task, section, isNew, isCompleting, isExiting, onToggle, onDelete, onArchive, onRestore, onShare }: TaskCardProps) {
  const age = getAgeLevel(task.created_at, task.completed);
  const ageBadges: Record<string, string> = { fresh: "Fresh note", aging: "Needs a look", stale: "Sitting awhile", critical: "Urgent" };

  return (
    <article className={["task-paper", `age-${age}`, isNew ? "is-new" : "", isCompleting ? "is-completing" : "", isExiting ? "is-exiting" : ""].join(" ").trim()}>
      <div className="task-line">
        {section === "active" && <button className={`task-check ${task.completed ? "checked" : ""}`} type="button" onClick={() => onToggle(task.id, task.completed)} aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"} />}
        <div className="task-body">
          <div className="task-title-wrap"><span className="task-title-text">{task.title}</span><span className="task-strike" aria-hidden="true" /></div>
          {task.description && <span className="task-desc">{task.description}</span>}
          <div className="task-meta">
            <span className="priority-chip"><span className="priority-dot" style={{ background: priorityColor(task.priority) }} />{task.priority}</span>
            <span>{timeAgo(task.created_at)}</span>
            {task.due_date && <span>Due {new Date(task.due_date).toLocaleDateString()}</span>}
            {section === "shared" && task.owner_name && <span>By {task.owner_name}</span>}
          </div>
        </div>
        <div className="task-actions">
          {section === "active" && ageBadges[age] && <span className="task-age">{ageBadges[age]}</span>}
          {section === "active" && <><button className="task-action" type="button" onClick={() => onShare(task)}>Share</button><button className="task-action" type="button" onClick={() => onArchive(task.id)}>Archive</button><button className="task-action delete-action" type="button" onClick={() => onDelete(task.id)}>Delete</button></>}
          {section === "past" && <><button className="task-action" type="button" onClick={() => onRestore(task.id)}>Restore</button><button className="task-action delete-action" type="button" onClick={() => onDelete(task.id)}>Delete</button></>}
        </div>
      </div>
    </article>
  );
}

function ProductivityPanel({ stats, neglected, suggestions, loading }: { stats: Stats | null; neglected: Task[]; suggestions: Task[]; loading: boolean }) {
  const [open, setOpen] = useState(true);
  if (loading) return <div className="panel-loading">Loading insights...</div>;
  if (!stats) return null;
  const active = Number(stats.active_tasks);
  const completed = Number(stats.completed_tasks);
  const rate = active + completed > 0 ? Math.round((completed / (active + completed)) * 100) : 0;

  return (
    <section className="productivity-panel">
      <button className="panel-toggle" type="button" onClick={() => setOpen((current) => !current)}><span>Notebook insights</span><span>{open ? "Hide" : "Show"}</span></button>
      {open && <><div className="stats-grid"><div className="stat-card"><div className="stat-num">{stats.active_tasks}</div><div className="stat-label">Active pages</div></div><div className="stat-card"><div className="stat-num">{stats.completed_this_week}</div><div className="stat-label">Done this week</div></div><div className="stat-card"><div className="stat-num">{rate}%</div><div className="stat-label">Completion rate</div></div><div className="stat-card"><div className="stat-num">{Math.round(Number(stats.avg_completion_hours))}h</div><div className="stat-label">Avg. finish</div></div></div>
      {neglected.length > 0 && <div className="insight-block warning"><div className="insight-title">Needs attention: {neglected.length} stale task{neglected.length > 1 ? "s" : ""}</div><ul className="insight-list">{neglected.map((task) => <li key={task.id}>{task.title}<span className="insight-age">({timeAgo(task.created_at)})</span></li>)}</ul></div>}
      {suggestions.length > 0 && <div className="insight-block info"><div className="insight-title">Suggested focus for today</div><ol className="insight-list">{suggestions.map((task) => <li key={task.id}>{task.title}<span className="priority-dot small" style={{ background: priorityColor(task.priority) }} />{task.due_date && <span className="insight-age">Due {new Date(task.due_date).toLocaleDateString()}</span>}</li>)}</ol></div>}</>}
    </section>
  );
}

function PencilDecoration({ active }: { active: boolean }) { return <div className={`pencil-decoration ${active ? "is-writing" : ""}`} aria-hidden="true"><div className="pencil-shadow" /><div className="pencil"><span className="pencil-eraser" /><span className="pencil-band" /><span className="pencil-body" /><span className="pencil-tip" /><span className="pencil-lead" /></div></div>; }

function ActivityFeed({ items, loading }: { items: ActivityItem[]; loading: boolean }) {
  if (loading) return <div className="activity-feed">{[1, 2, 3].map((item) => <div key={item} className="skeleton" />)}</div>;
  if (items.length === 0) return <div className="empty-state"><span className="empty-icon">//</span>No activity yet. Your recent task actions will show up here.</div>;
  return <div className="activity-feed">{items.map((item) => <div key={item.id} className="activity-card"><div className="activity-title">{item.task_title}</div><div className="activity-meta">{item.actor_name} {item.action} this task {timeAgo(item.created_at)}</div><div className="activity-badge">{item.action.replaceAll("_", " ")}</div></div>)}</div>;
}
export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [shareTarget, setShareTarget] = useState<Task | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [neglected, setNeglected] = useState<Task[]>([]);
  const [suggestions, setSuggestions] = useState<Task[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [recentlyAddedTaskId, setRecentlyAddedTaskId] = useState<number | null>(null);
  const [pencilActive, setPencilActive] = useState(false);
  const [completingTaskIds, setCompletingTaskIds] = useState<number[]>([]);
  const [exitingTasks, setExitingTasks] = useState<Record<number, TaskExitState>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  // Legacy placeholder — api.ts now always pulls a fresh Firebase ID token.
  const token = "";
  const section = useMemo(() => getSection(location.pathname), [location.pathname]);
  const sectionCopy = useMemo(() => getSectionCopy(section), [section]);
  const timeoutsRef = useRef<number[]>([]);

  const rememberTimeout = useCallback((callback: () => void, delay: number) => { const timeoutId = window.setTimeout(callback, delay); timeoutsRef.current.push(timeoutId); return timeoutId; }, []);
  const clearTaskEffects = useCallback((taskId: number) => { setCompletingTaskIds((current) => current.filter((id) => id !== taskId)); setExitingTasks((current) => { if (!(taskId in current)) return current; const next = { ...current }; delete next[taskId]; return next; }); }, []);
  const removeTaskFromState = useCallback((taskId: number) => { setTasks((current) => current.filter((task) => task.id !== taskId)); clearTaskEffects(taskId); }, [clearTaskEffects]);
  const beginExit = useCallback((taskId: number, exitState: TaskExitState, delay: number) => { setExitingTasks((current) => ({ ...current, [taskId]: exitState })); rememberTimeout(() => removeTaskFromState(taskId), delay); }, [rememberTimeout, removeTaskFromState]);
  const beginCompletionSequence = useCallback((taskId: number) => { setCompletingTaskIds((current) => (current.includes(taskId) ? current : [...current, taskId])); rememberTimeout(() => beginExit(taskId, "completing", COMPLETE_FADE_MS), COMPLETE_STRIKE_MS); }, [beginExit, rememberTimeout]);
  const triggerPencil = useCallback(() => { setPencilActive(true); rememberTimeout(() => setPencilActive(false), PENCIL_ANIMATION_MS); }, [rememberTimeout]);

  const loadTasks = useCallback(async (nextSection: Section) => {
    if (nextSection === "activity") { setTasks([]); setLoading(false); return; }
    setLoading(true); setRecentlyAddedTaskId(null); setCompletingTaskIds([]); setExitingTasks({});
    try { const status = nextSection === "past" ? "archived" : nextSection === "shared" ? "shared" : "active"; setTasks(await getTasks(token, status)); }
    catch (error) { console.error(error); }
    finally { setLoading(false); }
  }, [token]);

  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    try { const [nextStats, nextNeglected, nextSuggestions] = await Promise.all([getStats(token), getNeglected(token), getSuggestions(token)]); setStats(nextStats); setNeglected(nextNeglected); setSuggestions(nextSuggestions); }
    catch (error) { console.error(error); }
    finally { setInsightsLoading(false); }
  }, [token]);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try { setActivities(await getActivityLog(token)); }
    catch (error) { console.error(error); }
    finally { setActivityLoading(false); }
  }, [token]);

  useEffect(() => {
    void loadInsights();
    if (USE_MOCK_DASHBOARD || !user) {
      return () => {
        timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
        timeoutsRef.current = [];
      };
    }

    let cancelled = false;
    let socket: ReturnType<typeof io> | null = null;

    (async () => {
      const socketToken = await getFreshIdToken();
      if (cancelled || !socketToken) return;
      socket = io(SOCKET_URL, { auth: { token: socketToken }, transports: ["websocket"] });
      socket.on("task:updated", ({ task }: { task: Task }) => { setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, ...task } : item))); if (section === "active" && task.completed) beginCompletionSequence(task.id); if (section === "activity") void loadActivity(); });
      socket.on("task:deleted", ({ taskId }: { taskId: number }) => { removeTaskFromState(taskId); if (section === "activity") void loadActivity(); });
      socket.on("task:shared", () => { void loadTasks("shared"); void loadInsights(); void loadActivity(); });
    })();

    return () => {
      cancelled = true;
      if (socket) socket.disconnect();
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, [beginCompletionSequence, loadActivity, loadInsights, loadTasks, navigate, removeTaskFromState, section, user]);

  useEffect(() => { if (section === "activity") void loadActivity(); else void loadTasks(section); }, [loadActivity, loadTasks, section]);

  const doneTasks = useMemo(() => tasks.filter((task) => task.completed || completingTaskIds.includes(task.id)), [completingTaskIds, tasks]);
  const progress = tasks.length > 0 ? (doneTasks.length / tasks.length) * 100 : 0;

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      sessionStorage.removeItem("pendingLoginEmail");
      navigate("/login", { replace: true });
    }
  };
  const handleAddTask = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!title.trim()) return; setAdding(true); try { const newTask = await createTask(title.trim(), token, { priority }); setTasks((current) => [newTask, ...current]); setTitle(""); setRecentlyAddedTaskId(newTask.id); triggerPencil(); rememberTimeout(() => setRecentlyAddedTaskId((current) => (current === newTask.id ? null : current)), 1500); void loadInsights(); void loadActivity(); } catch (error) { console.error(error); } finally { setAdding(false); } };
  const handleToggle = async (taskId: number, completed: boolean) => { try { await toggleTask(taskId, !completed, token); setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, completed: !completed } : task))); if (!completed && section === "active") beginCompletionSequence(taskId); else clearTaskEffects(taskId); void loadInsights(); void loadActivity(); } catch (error) { console.error(error); } };
  const handleDelete = async (taskId: number) => { try { await deleteTask(taskId, token); beginExit(taskId, "deleting", DELETE_FADE_MS); void loadInsights(); void loadActivity(); } catch (error) { console.error(error); } };
  const handleArchive = async (taskId: number) => { try { await archiveTask(taskId, token); beginExit(taskId, "archiving", DELETE_FADE_MS); void loadInsights(); void loadActivity(); } catch (error) { console.error(error); } };
  const handleRestore = async (taskId: number) => { try { await restoreTask(taskId, token); beginExit(taskId, "restoring", DELETE_FADE_MS); void loadInsights(); void loadActivity(); } catch (error) { console.error(error); } };

  return (
    <>
      <style>{DASHBOARD_STYLES}</style>
      <div className="dash-root">
        <header className="topbar"><div><div className="topbar-kicker">Paper productivity</div><div className="topbar-logo">TaskLedger</div></div><button className="logout-btn" type="button" onClick={handleLogout}>Sign out</button></header>
        <ProductivityPanel stats={stats} neglected={neglected} suggestions={suggestions} loading={insightsLoading} />
        <div className="dashboard-shell">
          <aside className="dashboard-menu"><div className="menu-title">Workspace</div><p className="menu-copy">Move between active work, shared items, archived notes, and recent activity from one clear menu.</p><div className="menu-nav">{MENU_ITEMS.map((item) => <button key={item.section} type="button" className={`nav-link ${section === item.section ? "active" : ""}`} onClick={() => navigate(item.path)}><div className="nav-link-title">{item.label}</div><div className="nav-link-sub">{item.description}</div></button>)}</div><div className="menu-pill-row"><span className="menu-pill">{USE_MOCK_DASHBOARD ? "Demo mode" : "Live API"}</span><span className="menu-pill">{USE_MOCK_DASHBOARD ? "Auth bypassed" : "Firebase protected"}</span><span className="menu-pill">Task CRUD intact</span></div></aside>
          <section className="notebook-panel"><PencilDecoration active={pencilActive && section === "active"} /><div className="notebook-page"><div className="notebook-margin" aria-hidden="true" /><div className="notebook-header"><div><p className="notebook-kicker">{sectionCopy.kicker}</p><h1>{sectionCopy.title}</h1><p className="section-copy">{sectionCopy.description}</p></div></div>
            {section === "active" && <div className="section-card">New tasks land on the page like fresh notes. Completing one draws a line through it, then lets it drift away.</div>}
            {section === "shared" && <div className="section-card">This section is ready for collaboration review now, and leaves space for richer shared-work features later.</div>}
            {section === "past" && <div className="section-card">Archived items live here so the active notebook stays calm and focused.</div>}
            {section === "activity" && <div className="section-card">Recent task events are pulled from the backend activity log so this area feels like a real product surface, not just a placeholder.</div>}
            {section === "active" && tasks.length > 0 && <div className="progress-block"><div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div><div className="progress-label"><span>{doneTasks.length}</span> crossed off of <span>{tasks.length}</span></div></div>}
            {section === "active" && <form className="form-row" onSubmit={handleAddTask}><input className="task-input" placeholder="Write the next task on the page..." value={title} onChange={(event) => setTitle(event.target.value)} /><select className="priority-select" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select><button className="add-btn" type="submit" disabled={adding || !title.trim()}>{adding ? "Writing..." : "Add task"}</button></form>}
            <div className="divider" />
            {section === "activity" ? <ActivityFeed items={activities} loading={activityLoading} /> : loading ? <div className="task-list">{[1, 2, 3].map((item) => <div key={item} className="skeleton" />)}</div> : tasks.length === 0 ? <div className="empty-state"><span className="empty-icon">{section === "active" ? "..." : section === "past" ? "[]" : "//"}</span>{section === "active" && "No tasks yet. Start a fresh line above."}{section === "shared" && "Nothing has been shared with you yet."}{section === "past" && "No archived tasks right now."}</div> : <div className="task-list">{tasks.map((task) => <TaskCard key={task.id} task={task} section={section} isNew={recentlyAddedTaskId === task.id} isCompleting={completingTaskIds.includes(task.id)} isExiting={Boolean(exitingTasks[task.id])} onToggle={handleToggle} onDelete={handleDelete} onArchive={handleArchive} onRestore={handleRestore} onShare={setShareTarget} />)}</div>}
          </div></section>
        </div>
      </div>
      {shareTarget && <ShareModal task={shareTarget} token={token} onClose={() => setShareTarget(null)} />}
    </>
  );
}
