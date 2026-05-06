import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import {
  connectSocket,
  disconnectSocket,
  joinTaskRoom,
  syncTaskRooms,
} from "../services/socket";
import NotebookBackdrop from "../components/NotebookBackdrop";

const USE_MOCK_DASHBOARD = !import.meta.env.VITE_API_URL;
const COMPLETE_STRIKE_MS = 700;
const COMPLETE_FADE_MS = 850;
const DELETE_FADE_MS = 320;
const PENCIL_ANIMATION_MS = 900;

const DASHBOARD_STYLES = String.raw`
@import url("https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,600&family=Patrick+Hand&family=Manrope:wght@400;500;600;700&display=swap");
.dash-root{position:relative;min-height:100vh;padding:28px 16px 56px;font-family:"Manrope",sans-serif;color:#3e342d;background:radial-gradient(circle at top left,rgba(196,177,145,.3),transparent 34%),radial-gradient(circle at right 18%,rgba(143,170,173,.18),transparent 28%),linear-gradient(180deg,#e7dcc7 0%,#d8c7ab 100%)}
.dash-root *{box-sizing:border-box}.topbar,.productivity-panel,.dashboard-shell{position:relative;z-index:1;width:min(100%,1180px);margin:0 auto}.topbar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:18px}.topbar-kicker,.notebook-kicker{margin:0 0 4px;font-size:.74rem;letter-spacing:.18em;text-transform:uppercase;color:#8b6e63}.topbar-logo{font-family:"Newsreader",serif;font-size:clamp(2rem,3vw,2.6rem);line-height:1;color:#483931}.logout-btn,.panel-toggle,.nav-link,.task-action,.add-btn,.share-submit,.modal-close,.task-check{font:inherit}.logout-btn{border:1px solid rgba(84,63,52,.18);background:rgba(255,248,236,.72);color:#5a463d;border-radius:999px;padding:10px 16px;cursor:pointer;box-shadow:0 10px 20px rgba(83,58,36,.08)}
.productivity-panel,.dashboard-menu{border-radius:28px;padding:22px;border:1px solid rgba(121,97,81,.12);background:rgba(249,243,232,.74);box-shadow:0 16px 34px rgba(115,92,69,.12);backdrop-filter:blur(10px)}.productivity-panel{margin-bottom:24px}.panel-toggle{width:100%;display:flex;justify-content:space-between;align-items:center;border:0;background:transparent;color:#6b564a;padding:0;cursor:pointer;font-weight:600}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:18px}.stat-card,.activity-card,.section-card{border-radius:18px;padding:16px;background:rgba(255,251,244,.82);border:1px solid rgba(121,97,81,.08)}.stat-num{font-family:"Newsreader",serif;font-size:2rem;line-height:1}.stat-label{margin-top:6px;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:#877265}.insight-block{margin-top:14px;padding:14px 16px;border-radius:16px;border-left:3px solid}.insight-block.warning{background:rgba(232,203,151,.26);border-left-color:#c89c53}.insight-block.info{background:rgba(168,192,198,.18);border-left-color:#78939b}.insight-title{margin-bottom:8px;font-weight:700;color:#59463d}.insight-list{margin:0;padding-left:18px;display:grid;gap:6px;color:#685349}.insight-age{margin-left:6px;color:#8c7568}.panel-loading{width:min(100%,1180px);margin:0 auto 24px;color:#7d685c}
.dashboard-shell{display:grid;grid-template-columns:240px minmax(0,1fr);gap:22px;align-items:start}.dashboard-menu{position:sticky;top:28px}.menu-title{font-family:"Newsreader",serif;font-size:1.4rem;margin-bottom:8px}.menu-copy,.section-copy{color:#7c675a;line-height:1.55}.menu-copy{font-size:.95rem;margin-bottom:18px}.menu-nav{display:grid;gap:10px}.nav-link{border:1px solid rgba(109,84,68,.12);background:rgba(255,251,244,.82);color:#6a5446;padding:14px;border-radius:20px;cursor:pointer;text-align:left}.nav-link.active{background:rgba(243,230,210,.96);box-shadow:0 10px 18px rgba(112,87,62,.1)}.nav-link-title{font-weight:700;color:#4a3a31}.nav-link-sub{margin-top:4px;font-size:.84rem;color:#7f695d}
.notebook-panel{display:grid;grid-template-columns:96px minmax(0,1fr);gap:18px}.pencil-decoration{position:sticky;top:36px;display:flex;justify-content:center;padding-top:42px}.pencil{position:relative;width:24px;height:240px;transform:rotate(18deg);filter:drop-shadow(0 18px 18px rgba(102,75,52,.18))}.pencil-shadow{position:absolute;inset:56px 24px 0;border-radius:999px;background:rgba(72,57,49,.08);filter:blur(14px)}.pencil-eraser,.pencil-band,.pencil-body,.pencil-tip,.pencil-lead{position:absolute;left:50%;transform:translateX(-50%);display:block}.pencil-eraser{top:0;width:18px;height:22px;background:linear-gradient(180deg,#f0a7a6,#d68483);border-radius:10px 10px 6px 6px}.pencil-band{top:20px;width:20px;height:14px;background:linear-gradient(180deg,#d2d5d9,#aab0b8)}.pencil-body{top:34px;width:18px;height:168px;border-radius:10px;background:linear-gradient(180deg,#f3ca67,#d99f2b)}.pencil-tip{bottom:18px;width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-top:28px solid #c49d72}.pencil-lead{bottom:0;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:18px solid #57453b}.pencil-decoration.is-writing .pencil{animation:pencil-sweep .9s cubic-bezier(.22,1,.36,1)}@keyframes pencil-sweep{0%{transform:translate(-4px,0) rotate(18deg)}35%{transform:translate(26px,8px) rotate(12deg)}75%{transform:translate(10px,-2px) rotate(20deg)}100%{transform:translate(0,0) rotate(18deg)}}
.notebook-page{position:relative;overflow:hidden;border-radius:32px;padding:34px 28px 36px 72px;min-height:72vh;background:linear-gradient(180deg,rgba(255,252,245,.96),rgba(248,240,226,.95)),repeating-linear-gradient(180deg,rgba(116,157,197,0) 0,rgba(116,157,197,0) 39px,rgba(116,157,197,.2) 39px,rgba(116,157,197,.2) 41px);border:1px solid rgba(106,84,71,.12);box-shadow:0 24px 60px rgba(109,85,58,.18),inset 0 1px 0 rgba(255,255,255,.7)}.notebook-page::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.3),transparent 20%),repeating-linear-gradient(180deg,transparent 0,transparent 39px,rgba(116,157,197,.15) 39px,rgba(116,157,197,.15) 41px);pointer-events:none}.notebook-margin{position:absolute;top:0;bottom:0;left:48px;width:2px;background:linear-gradient(180deg,rgba(205,94,111,.45),rgba(205,94,111,.75),rgba(205,94,111,.45))}.notebook-header,.form-row,.progress-block,.task-list,.empty-state,.divider,.activity-feed,.section-card{position:relative;z-index:1}.notebook-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px}.notebook-header h1{margin:0;font-family:"Newsreader",serif;font-size:clamp(2.1rem,4vw,3.4rem);line-height:.95;color:#49362d}.section-copy{max-width:420px;margin-top:8px}.progress-block{margin-bottom:18px}.progress-bar-wrap{width:100%;height:6px;border-radius:999px;background:rgba(111,148,182,.2);overflow:hidden}.progress-bar-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#d1a15c,#d67f72);transition:width .4s ease}.progress-label{margin-top:8px;color:#7f695d;font-size:.95rem}.progress-label span{color:#4a3a31;font-weight:700}.form-row{display:grid;grid-template-columns:minmax(0,1fr) 180px auto;gap:12px;margin-bottom:18px}.task-input,.priority-select,.share-input{border:1px solid rgba(107,82,66,.14);background:rgba(255,251,244,.86);color:#4d3b31;border-radius:16px;padding:14px 16px;outline:none}.task-input::placeholder,.share-input::placeholder{color:#9b877b}.add-btn,.share-submit{border:0;border-radius:16px;background:linear-gradient(135deg,#d08f58,#c5655d);color:#fffaf4;padding:14px 18px;cursor:pointer;box-shadow:0 14px 24px rgba(169,99,69,.18)}.add-btn:disabled,.share-submit:disabled{opacity:.6;cursor:not-allowed}.divider{height:1px;background:linear-gradient(90deg,rgba(121,97,81,.05),rgba(121,97,81,.22),rgba(121,97,81,.05));margin-bottom:8px}
.task-list,.activity-feed{display:grid;gap:0}.task-paper,.skeleton{min-height:82px}.task-paper{position:relative;padding:14px 0 16px;border-bottom:1px solid rgba(102,141,178,.18);transition:background .28s ease,opacity .28s ease,transform .28s ease,filter .28s ease}.task-paper.age-fresh{background:linear-gradient(90deg,rgba(214,236,224,.4),transparent 52%)}.task-paper.age-normal{background:linear-gradient(90deg,rgba(248,244,236,.32),transparent 50%)}.task-paper.age-aging{background:linear-gradient(90deg,rgba(245,228,196,.48),transparent 55%)}.task-paper.age-stale{background:linear-gradient(90deg,rgba(242,212,188,.58),transparent 58%)}.task-paper.age-critical{background:linear-gradient(90deg,rgba(241,208,201,.65),transparent 60%)}.task-paper.age-done{background:linear-gradient(90deg,rgba(232,228,220,.42),transparent 50%)}.task-paper.task-shared{border-bottom-color:rgba(90,120,118,.26);background:linear-gradient(90deg,rgba(218,232,228,.48),rgba(252,247,236,.38) 42%,transparent 72%)}.task-paper.task-shared.age-fresh{background:linear-gradient(90deg,rgba(198,228,218,.52),rgba(248,243,232,.32) 48%,transparent 76%)}.task-paper.task-shared.age-critical{background:linear-gradient(90deg,rgba(236,214,206,.55),rgba(220,236,232,.22) 38%,transparent 76%)}.share-perm{display:inline-flex;align-items:center;border-radius:999px;padding:4px 11px;font-size:.72rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase}.share-perm-view{background:rgba(88,118,112,.12);color:#2f4a44;border:1px solid rgba(88,118,112,.26)}.share-perm-edit{background:rgba(168,118,72,.14);color:#5a3d22;border:1px solid rgba(168,118,72,.3)}.task-paper::before{content:"";position:absolute;left:-26px;top:22px;width:10px;height:10px;border-radius:50%;background:rgba(207,180,152,.58)}.task-line{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:start}.task-check{margin-top:5px;width:20px;height:20px;border-radius:50%;border:1.5px solid rgba(120,95,79,.5);background:rgba(255,250,242,.72);cursor:pointer}.task-check.checked{background:radial-gradient(circle at 50% 50%,#c5655d 0 45%,rgba(197,101,93,.16) 46% 100%);border-color:#c5655d}.task-body{min-width:0}.task-title-wrap{position:relative;display:inline-block;max-width:100%}.task-title-text{display:inline-block;max-width:100%;font-family:"Patrick Hand",cursive;font-size:clamp(1.35rem,2vw,1.6rem);line-height:1.15;color:#3f3028;word-break:break-word}.task-strike{position:absolute;left:-2px;right:-2px;top:55%;height:1.5px;border-radius:999px;background:#7d5d4b;transform:scaleX(0);transform-origin:left center;opacity:0}.task-desc{margin-top:4px;display:block;color:#7c675a}.task-meta{margin-top:8px;display:flex;flex-wrap:wrap;gap:8px 14px;font-size:.86rem;color:#846e61}.priority-chip{display:inline-flex;align-items:center;gap:7px;text-transform:capitalize}.priority-dot{width:8px;height:8px;border-radius:50%;display:inline-block}.priority-dot.small{margin-left:8px}.task-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;align-items:center;max-width:240px}.task-age{font-size:.78rem;color:#8d786b}.task-action{border:0;background:rgba(240,229,211,.7);color:#6c5547;border-radius:999px;padding:8px 12px;cursor:pointer}.delete-action:hover{background:rgba(216,111,100,.16);color:#9f4039}.task-paper.is-new .task-title-text{animation:task-write-in .9s cubic-bezier(.22,1,.36,1)}.task-paper.is-new::after{content:"";position:absolute;left:34px;right:170px;top:20px;height:24px;background:linear-gradient(90deg,rgba(241,207,145,.36),rgba(241,207,145,0));animation:ink-sheen .95s ease-out}.task-paper.is-completing .task-strike{opacity:1;animation:strike-through .7s ease forwards}.task-paper.is-completing .task-title-text{color:#8f7b6e}.task-paper.is-exiting{opacity:0;filter:blur(2px);transform:translateX(16px) translateY(8px)}@keyframes task-write-in{0%{opacity:0;transform:translateY(8px) scale(.98);clip-path:inset(0 100% 0 0)}55%{opacity:1;clip-path:inset(0 12% 0 0)}100%{opacity:1;transform:translateY(0) scale(1);clip-path:inset(0 0 0 0)}}@keyframes ink-sheen{0%{opacity:0;transform:translateX(-24px)}30%{opacity:1}100%{opacity:0;transform:translateX(42px)}}@keyframes strike-through{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}.activity-card{margin-bottom:12px}.activity-title{font-weight:700;color:#4a3a31}.activity-meta{margin-top:6px;color:#80695d;font-size:.92rem}.activity-badge{display:inline-flex;margin-top:10px;border-radius:999px;padding:6px 10px;background:rgba(208,143,88,.14);color:#87562f;font-size:.8rem;text-transform:capitalize}.empty-state{text-align:center;padding:42px 0 18px;color:#816a5e}.empty-icon{display:block;margin-bottom:10px;font-family:"Patrick Hand",cursive;font-size:2rem;color:#ae9385}.skeleton{border-radius:18px;background:linear-gradient(90deg,rgba(255,251,244,.4),rgba(245,236,221,.86),rgba(255,251,244,.4));background-size:220% 100%;animation:skeleton-pulse 1.3s ease infinite}@keyframes skeleton-pulse{0%{background-position:100% 0}100%{background-position:-100% 0}}
.modal-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(68,48,34,.32);backdrop-filter:blur(8px);z-index:20}.modal-box{width:min(100%,420px);padding:28px;border-radius:28px;background:#fbf5eb;border:1px solid rgba(106,84,71,.12);box-shadow:0 24px 50px rgba(95,69,52,.16)}.modal-header{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:8px;font-family:"Newsreader",serif;font-size:1.5rem}.modal-close{width:34px;height:34px;border:0;border-radius:50%;background:rgba(121,97,81,.08);color:#5f4a3f;cursor:pointer}.modal-task-name{margin-bottom:18px;color:#80695d}.perm-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}.perm-btn{border-radius:16px;padding:12px;border:1px solid rgba(106,84,71,.12);background:rgba(255,251,244,.78);color:#715b4e;cursor:pointer;text-align:center}.perm-btn.active{border-color:rgba(88,118,112,.42);background:rgba(218,232,228,.52)}.share-success,.share-error{margin-bottom:12px}.share-success{color:#52715c}.share-error{color:#a34b45}
@media (max-width:980px){.dashboard-shell{grid-template-columns:1fr}.dashboard-menu{position:relative;top:0}.notebook-panel{grid-template-columns:1fr}.pencil-decoration{position:relative;top:0;justify-content:flex-start;padding:0 0 6px 18px}.pencil{height:120px;transform:rotate(76deg)}}@media (max-width:720px){.stats-grid,.form-row,.task-line{grid-template-columns:1fr}.notebook-page{padding:28px 18px 26px 50px}.notebook-margin{left:30px}.task-paper::before{left:-15px}.task-actions{justify-content:flex-start;max-width:none}.topbar,.notebook-header{flex-direction:column;align-items:flex-start}}@media (max-width:520px){.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.perm-row{grid-template-columns:1fr}}

/* ─── Polish layer: hovers, focus rings, transitions ──────────────── */
.logout-btn,.add-btn,.share-submit,.task-action,.nav-link,.panel-toggle,.task-check,.modal-close,.perm-btn{transition:transform .12s ease,box-shadow .18s ease,background .18s ease,border-color .18s ease,color .18s ease,filter .18s ease}
.logout-btn:hover{background:rgba(255,251,244,.95);border-color:rgba(84,63,52,.34);box-shadow:0 12px 22px rgba(83,58,36,.12)}
.logout-btn:active{transform:translateY(1px)}
.logout-btn:focus-visible,.task-action:focus-visible,.nav-link:focus-visible,.panel-toggle:focus-visible,.modal-close:focus-visible,.perm-btn:focus-visible{outline:2px solid rgba(197,101,93,.55);outline-offset:2px}
.add-btn:hover:not(:disabled),.share-submit:hover:not(:disabled){filter:brightness(1.05);box-shadow:0 18px 28px rgba(169,99,69,.24),inset 0 1px 0 rgba(255,255,255,.32)}
.add-btn:active:not(:disabled),.share-submit:active:not(:disabled){transform:translateY(1px)}
.add-btn:focus-visible,.share-submit:focus-visible{outline:2px solid #fffdf7;outline-offset:2px}
.task-input,.priority-select,.share-input{transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}
.task-input:hover,.priority-select:hover,.share-input:hover{border-color:rgba(107,82,66,.32)}
.task-input:focus,.priority-select:focus,.share-input:focus{outline:none;border-color:rgba(197,101,93,.55);background:#fffdf7;box-shadow:0 0 0 3px rgba(197,101,93,.18)}
.task-action:hover{background:rgba(232,217,191,.85);color:#4f3d31}
.delete-action{color:#9f4039}
.nav-link:hover{background:rgba(248,238,220,.96);border-color:rgba(109,84,68,.22)}
.task-check:hover{border-color:rgba(197,101,93,.7);box-shadow:0 0 0 3px rgba(197,101,93,.12)}
.task-check:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(197,101,93,.32)}
.modal-close:hover{background:rgba(121,97,81,.18)}
.perm-btn:hover{border-color:rgba(88,118,112,.32)}
.task-paper:hover{background-color:rgba(255,251,244,.42)}
@media (prefers-reduced-motion:reduce){
  .logout-btn,.add-btn,.share-submit,.task-action,.nav-link,.panel-toggle,.task-check,.modal-close,.perm-btn,.task-input,.priority-select,.share-input,.task-paper{transition:none}
  .pencil-decoration.is-writing .pencil,.task-paper.is-new .task-title-text,.task-paper.is-new::after,.task-paper.is-completing .task-strike{animation:none}
}
/* Toasts */
.toast-stack{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:50;display:flex;flex-direction:column;gap:8px;pointer-events:none;width:min(92vw,420px)}
.toast{pointer-events:auto;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:14px;font-size:.92rem;line-height:1.35;box-shadow:0 14px 30px rgba(83,58,36,.18);border:1px solid;animation:toast-in .2s ease-out}
.toast.error{background:#fff2ee;border-color:#e0aea3;color:#7a2c22}
.toast.info{background:#eef4ee;border-color:#a9c4ad;color:#2f4a32}
.toast-close{background:transparent;border:0;color:inherit;font-size:1.1rem;line-height:1;cursor:pointer;padding:0 2px;opacity:.7}
.toast-close:hover{opacity:1}
@keyframes toast-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){.toast{animation:none}}
`;

type Priority = "low" | "medium" | "high";
type Section = "active" | "shared" | "past" | "activity";
type TaskExitState = "completing" | "deleting" | "archiving" | "restoring";

interface Task { id: number; title: string; description?: string; completed: boolean; archived: boolean; priority: Priority; due_date?: string; created_at: string; updated_at?: string; archived_at?: string; owner_name?: string; owner_email?: string; permission?: string; collaborators?: { id: number; name: string; permission: string }[]; }
interface Stats {
  active_tasks: string;
  completed_tasks: string;
  completed_this_week: string;
  stale_tasks: string;
  avg_completion_hours: string | null;
  finish_samples_30d?: string;
}
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
function formatAvgFinish(stats: Stats): string {
  const samples = Number(stats.finish_samples_30d ?? 0);
  if (!Number.isFinite(samples) || samples < 1) return "?";
  const raw = stats.avg_completion_hours;
  if (raw == null || raw === "") return "?";
  const h = Number(raw);
  if (!Number.isFinite(h)) return "?";
  if (h < 1 / 60) return "<1m";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 48) {
    const rounded = Math.round(h * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}h` : `${rounded.toFixed(1)}h`;
  }
  return `${Math.round(h / 24)}d`;
}
function priorityColor(priority: Priority) { return priority === "high" ? "#cc6b5f" : priority === "medium" ? "#c89c53" : "#6d9478"; }
function getErrorMessage(error: unknown) { return error instanceof Error ? error.message : "Something went wrong"; }

type Toast = { id: number; kind: "error" | "info"; message: string };

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack" role="region" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"}>
          <span>{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
function ShareModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("view");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleShare = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true); setErrorMessage(""); setMessage("");
    try { await shareTask(task.id, email, permission); setMessage(`Shared with ${email}.`); setEmail(""); }
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
    <article
      className={["task-paper", `age-${age}`, section === "shared" ? "task-shared" : "", isNew ? "is-new" : "", isCompleting ? "is-completing" : "", isExiting ? "is-exiting" : ""]
        .filter(Boolean)
        .join(" ")}
    >
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
            {section === "shared" && task.permission && (
              <span className={task.permission === "edit" ? "share-perm share-perm-edit" : "share-perm share-perm-view"}>
                {task.permission === "edit" ? "Can edit" : "View only"}
              </span>
            )}
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
      {open && <><div className="stats-grid"><div className="stat-card"><div className="stat-num">{stats.active_tasks}</div><div className="stat-label">Active pages</div></div><div className="stat-card"><div className="stat-num">{stats.completed_this_week}</div><div className="stat-label">Done this week</div></div><div className="stat-card"><div className="stat-num">{rate}%</div><div className="stat-label">Completion rate</div></div><div className="stat-card"><div className="stat-num">{formatAvgFinish(stats)}</div><div className="stat-label">Avg. finish (30d)</div></div></div>
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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const section = useMemo(() => getSection(location.pathname), [location.pathname]);
  const sectionCopy = useMemo(() => getSectionCopy(section), [section]);
  const timeoutsRef = useRef<number[]>([]);

  const rememberTimeout = useCallback((callback: () => void, delay: number) => { const timeoutId = window.setTimeout(callback, delay); timeoutsRef.current.push(timeoutId); return timeoutId; }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notifyError = useCallback(
    (error: unknown, fallback: string) => {
      const message = getErrorMessage(error) || fallback;
      // eslint-disable-next-line no-console
      console.error(message, error);
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { id, kind: "error", message }]);
      rememberTimeout(() => dismissToast(id), 4500);
    },
    [dismissToast, rememberTimeout]
  );

  const clearTaskEffects = useCallback((taskId: number) => { setCompletingTaskIds((current) => current.filter((id) => id !== taskId)); setExitingTasks((current) => { if (!(taskId in current)) return current; const next = { ...current }; delete next[taskId]; return next; }); }, []);
  const removeTaskFromState = useCallback((taskId: number) => { setTasks((current) => current.filter((task) => task.id !== taskId)); clearTaskEffects(taskId); }, [clearTaskEffects]);
  const beginExit = useCallback((taskId: number, exitState: TaskExitState, delay: number) => { setExitingTasks((current) => ({ ...current, [taskId]: exitState })); rememberTimeout(() => removeTaskFromState(taskId), delay); }, [rememberTimeout, removeTaskFromState]);
  const beginCompletionSequence = useCallback((taskId: number) => { setCompletingTaskIds((current) => (current.includes(taskId) ? current : [...current, taskId])); rememberTimeout(() => beginExit(taskId, "completing", COMPLETE_FADE_MS), COMPLETE_STRIKE_MS); }, [beginExit, rememberTimeout]);
  const triggerPencil = useCallback(() => { setPencilActive(true); rememberTimeout(() => setPencilActive(false), PENCIL_ANIMATION_MS); }, [rememberTimeout]);

  const loadTasks = useCallback(async (nextSection: Section) => {
    if (nextSection === "activity") { setTasks([]); setLoading(false); return; }
    setLoading(true); setRecentlyAddedTaskId(null); setCompletingTaskIds([]); setExitingTasks({});
    try { const status = nextSection === "past" ? "archived" : nextSection === "shared" ? "shared" : "active"; setTasks(await getTasks(undefined, status)); }
    catch (error) { console.error(error); }
    finally { setLoading(false); }
  }, []);

  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    try { const [nextStats, nextNeglected, nextSuggestions] = await Promise.all([getStats(), getNeglected(), getSuggestions()]); setStats(nextStats); setNeglected(nextNeglected); setSuggestions(nextSuggestions); }
    catch (error) { console.error(error); }
    finally { setInsightsLoading(false); }
  }, []);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try { setActivities(await getActivityLog()); }
    catch (error) { console.error(error); }
    finally { setActivityLoading(false); }
  }, []);

  // Load productivity insights once per mount.
  useEffect(() => { void loadInsights(); }, [loadInsights]);

  // Cleanup pending UI timeouts on unmount.
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, []);

  // Refs let socket listeners always read the latest section / callbacks
  // without needing to rebind the listeners on every state change.
  const sectionRef = useRef(section);
  useEffect(() => { sectionRef.current = section; }, [section]);
  const loadActivityRef = useRef(loadActivity);
  useEffect(() => { loadActivityRef.current = loadActivity; }, [loadActivity]);
  const loadTasksRef = useRef(loadTasks);
  useEffect(() => { loadTasksRef.current = loadTasks; }, [loadTasks]);
  const loadInsightsRef = useRef(loadInsights);
  useEffect(() => { loadInsightsRef.current = loadInsights; }, [loadInsights]);
  const beginCompletionRef = useRef(beginCompletionSequence);
  useEffect(() => { beginCompletionRef.current = beginCompletionSequence; }, [beginCompletionSequence]);
  const removeTaskRef = useRef(removeTaskFromState);
  useEffect(() => { removeTaskRef.current = removeTaskFromState; }, [removeTaskFromState]);

  // Socket lifecycle — open once per signed-in user, listen to live events.
  // Stays connected across tab switches; disconnects only when user signs out / unmounts.
  useEffect(() => {
    if (USE_MOCK_DASHBOARD || !user) return;

    let cancelled = false;

    (async () => {
      const socket = await connectSocket();
      if (cancelled || !socket) return;

      socket.on("task:updated", ({ task }: { task: Task }) => {
        setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, ...task } : item)));
        if (sectionRef.current === "active" && task.completed) beginCompletionRef.current(task.id);
        if (sectionRef.current === "activity") void loadActivityRef.current();
      });

      socket.on("task:deleted", ({ taskId }: { taskId: number }) => {
        removeTaskRef.current(taskId);
        if (sectionRef.current === "activity") void loadActivityRef.current();
      });

      socket.on("task:shared", ({ task }: { task: Task }) => {
        // The collaborator joins the new task's room so they receive its future updates.
        joinTaskRoom(task.id);
        if (sectionRef.current === "shared") void loadTasksRef.current("shared");
        void loadInsightsRef.current();
        void loadActivityRef.current();
      });
    })();

    return () => {
      cancelled = true;
      disconnectSocket();
    };
  }, [user]);

  // Whenever the visible task list changes, sync our joined Socket.IO rooms
  // so we receive task:updated / task:deleted for exactly those tasks.
  useEffect(() => {
    if (USE_MOCK_DASHBOARD || !user) return;
    syncTaskRooms(tasks.map((task) => task.id));
  }, [tasks, user]);

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
  const handleAddTask = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!title.trim()) return; setAdding(true); try { const newTask = await createTask(title.trim(), undefined, { priority }); setTasks((current) => [newTask, ...current]); setTitle(""); setRecentlyAddedTaskId(newTask.id); triggerPencil(); rememberTimeout(() => setRecentlyAddedTaskId((current) => (current === newTask.id ? null : current)), 1500); void loadInsights(); void loadActivity(); } catch (error) { notifyError(error, "Couldn't add the task. Please try again."); } finally { setAdding(false); } };
  const handleToggle = async (taskId: number, completed: boolean) => { try { await toggleTask(taskId, !completed); setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, completed: !completed } : task))); if (!completed && section === "active") beginCompletionSequence(taskId); else clearTaskEffects(taskId); void loadInsights(); void loadActivity(); } catch (error) { notifyError(error, "Couldn't update the task."); } };
  const handleDelete = async (taskId: number) => { try { await deleteTask(taskId); beginExit(taskId, "deleting", DELETE_FADE_MS); void loadInsights(); void loadActivity(); } catch (error) { notifyError(error, "Couldn't delete the task."); } };
  const handleArchive = async (taskId: number) => { try { await archiveTask(taskId); beginExit(taskId, "archiving", DELETE_FADE_MS); void loadInsights(); void loadActivity(); } catch (error) { notifyError(error, "Couldn't archive the task."); } };
  const handleRestore = async (taskId: number) => { try { await restoreTask(taskId); beginExit(taskId, "restoring", DELETE_FADE_MS); void loadInsights(); void loadActivity(); } catch (error) { notifyError(error, "Couldn't restore the task."); } };

  return (
    <>
      <style>{DASHBOARD_STYLES}</style>
      <div className="dash-root">
        <NotebookBackdrop palette="light" density={30} seed={9001} />
        <header className="topbar"><div><div className="topbar-kicker">Paper productivity</div><div className="topbar-logo">TaskLedger</div></div><button className="logout-btn" type="button" onClick={handleLogout}>Sign out</button></header>
        <ProductivityPanel stats={stats} neglected={neglected} suggestions={suggestions} loading={insightsLoading} />
        <div className="dashboard-shell">
          <aside className="dashboard-menu"><div className="menu-title">Workspace</div><p className="menu-copy">Switch between what you are doing now, what others shared, your archive, and a short history.</p><div className="menu-nav">{MENU_ITEMS.map((item) => <button key={item.section} type="button" className={`nav-link ${section === item.section ? "active" : ""}`} onClick={() => navigate(item.path)}><div className="nav-link-title">{item.label}</div><div className="nav-link-sub">{item.description}</div></button>)}</div></aside>
          <section className="notebook-panel"><PencilDecoration active={pencilActive && section === "active"} /><div className="notebook-page"><div className="notebook-margin" aria-hidden="true" /><div className="notebook-header"><div><p className="notebook-kicker">{sectionCopy.kicker}</p><h1>{sectionCopy.title}</h1><p className="section-copy">{sectionCopy.description}</p></div></div>
            {section === "active" && tasks.length > 0 && <div className="progress-block"><div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div><div className="progress-label"><span>{doneTasks.length}</span> crossed off of <span>{tasks.length}</span></div></div>}
            {section === "active" && <form className="form-row" onSubmit={handleAddTask}><input className="task-input" placeholder="Write the next task on the page..." value={title} onChange={(event) => setTitle(event.target.value)} /><select className="priority-select" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select><button className="add-btn" type="submit" disabled={adding || !title.trim()}>{adding ? "Writing..." : "Add task"}</button></form>}
            <div className="divider" />
            {section === "activity" ? <ActivityFeed items={activities} loading={activityLoading} /> : loading ? <div className="task-list">{[1, 2, 3].map((item) => <div key={item} className="skeleton" />)}</div> : tasks.length === 0 ? <div className="empty-state"><span className="empty-icon">{section === "active" ? "..." : section === "past" ? "[]" : "//"}</span>{section === "active" && "No tasks yet. Start a fresh line above."}{section === "shared" && "Nothing has been shared with you yet."}{section === "past" && "No archived tasks right now."}</div> : <div className="task-list">{tasks.map((task) => <TaskCard key={task.id} task={task} section={section} isNew={recentlyAddedTaskId === task.id} isCompleting={completingTaskIds.includes(task.id)} isExiting={Boolean(exitingTasks[task.id])} onToggle={handleToggle} onDelete={handleDelete} onArchive={handleArchive} onRestore={handleRestore} onShare={setShareTarget} />)}</div>}
          </div></section>
        </div>
      </div>
      {shareTarget && <ShareModal task={shareTarget} onClose={() => setShareTarget(null)} />}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}