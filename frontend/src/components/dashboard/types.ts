/*
 * Shared types and small helpers for the dashboard components.
 * These match the shape returned by services/api.ts.
 */

export type Priority = "low" | "medium" | "high";
export type Section = "active" | "shared" | "past" | "activity";
export type TaskExitState = "completing" | "deleting" | "archiving" | "restoring";

export interface Task {
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

export interface Stats {
  active_tasks: string;
  completed_tasks: string;
  completed_this_week: string;
  stale_tasks: string;
  avg_completion_hours: string | null;
  finish_samples_30d?: string;
}

export interface ActivityItem {
  id: number;
  task_id: number;
  task_title: string;
  action: string;
  actor_name: string;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export type Toast = { id: number; kind: "error" | "info"; message: string };

export const SECTION_COPY: Record<Section, { kicker: string; title: string; description: string }> = {
  active: {
    kicker: "Daily dashboard",
    title: "Write it down. Clear the page.",
    description:
      "Keep active work on a notebook page, add the next task quickly, and cross things off with momentum.",
  },
  shared: {
    kicker: "Collaboration",
    title: "Shared tasks at a glance",
    description:
      "Stay oriented on work others have handed over or invited you into.",
  },
  past: {
    kicker: "Archive",
    title: "Past work, neatly tucked away",
    description:
      "Review archived notes, restore them, or clear them out when they are no longer useful.",
  },
  activity: {
    kicker: "History",
    title: "Track what happened recently",
    description:
      "See task changes, completions, shares, and restores in one lightweight activity stream.",
  },
};

export function sectionFromPath(pathname: string): Section {
  if (pathname.endsWith("/shared")) return "shared";
  if (pathname.endsWith("/past")) return "past";
  if (pathname.endsWith("/activity")) return "activity";
  return "active";
}

export function getAgeLevel(createdAt: string, completed: boolean): string {
  if (completed) return "done";
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  if (hours < 24) return "fresh";
  if (hours < 72) return "normal";
  if (hours < 168) return "aging";
  if (hours < 336) return "stale";
  return "critical";
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

export function priorityColor(priority: Priority): string {
  return priority === "high" ? "#cc6b5f" : priority === "medium" ? "#c89c53" : "#6d9478";
}

export function formatAvgFinish(stats: Stats): string {
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

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export const AGE_BADGES: Record<string, string> = {
  fresh: "Fresh note",
  aging: "Needs a look",
  stale: "Sitting awhile",
  critical: "Urgent",
};

export const NAV_LINKS: Array<{
  path: string;
  label: string;
  hint: string;
  match?: (pathname: string) => boolean;
}> = [
  { path: "/dashboard", label: "Today", hint: "Active tasks", match: (p) => p === "/dashboard" || p === "/dashboard/" },
  { path: "/kanban", label: "Kanban", hint: "Drag columns" },
  { path: "/calendar", label: "Calendar", hint: "By due date" },
  { path: "/focus", label: "Focus", hint: "25-min sprints" },
  { path: "/stats", label: "Stats", hint: "Weekly trends" },
];

export const SECTION_LINKS: Array<{ section: Section; label: string; path: string; hint: string }> = [
  { section: "active",   label: "Active",   path: "/dashboard",          hint: "Current work" },
  { section: "shared",   label: "Shared",   path: "/dashboard/shared",   hint: "From others" },
  { section: "past",     label: "Past",     path: "/dashboard/past",     hint: "Archived" },
  { section: "activity", label: "Activity", path: "/dashboard/activity", hint: "Recent moves" },
];
