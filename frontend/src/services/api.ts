import { getFreshIdToken } from "./firebase";

const API = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

type ApiErrorPayload = {
  error?: string;
  details?: string;
  code?: string;
};

export class ApiError extends Error {
  code?: string;
  details?: string;
  status: number;

  constructor(message: string, status: number, payload: ApiErrorPayload = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

type Priority = "low" | "medium" | "high";

type Task = {
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
};

type Stats = {
  active_tasks: string;
  completed_tasks: string;
  completed_this_week: string;
  stale_tasks: string;
  avg_completion_hours: string;
};

function requireApiBase(): string {
  if (!API) {
    throw new ApiError(
      "The frontend API URL is missing. Set VITE_API_URL before using the app.",
      500,
      { code: "API_URL_MISSING", details: "VITE_API_URL is not configured." }
    );
  }
  return API;
}

async function buildHeaders(explicitToken?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Explicit token wins (e.g. during one-off integration tests); otherwise
  // always grab a fresh Firebase ID token so expired tokens self-heal.
  const token = explicitToken && explicitToken !== "demo-token"
    ? explicitToken
    : await getFreshIdToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function readPayload(res: Response): Promise<ApiErrorPayload & Record<string, unknown>> {
  return res.json().catch(() => ({}));
}

async function requestJson<T>(
  path: string,
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string>; token?: string },
  fallbackMessage: string
): Promise<T> {
  const base = requireApiBase();
  const headers = { ...(await buildHeaders(init.token)), ...(init.headers ?? {}) };

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { ...init, headers });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Network request failed before the server responded.";
    throw new ApiError(
      "Unable to reach the server. Check the API URL, backend status, or CORS configuration.",
      0,
      { code: "NETWORK_REQUEST_FAILED", details }
    );
  }

  const data = await readPayload(res);
  if (!res.ok) {
    throw new ApiError(String(data.details || data.error || fallbackMessage), res.status, data);
  }
  return data as T;
}

// ─────────────────────────────────────────────────────────────
// Legacy /auth/* endpoints
//
// The Firebase-based auth flow lives entirely on the frontend now
// (see src/pages/Login.tsx etc.), so these helpers are only kept as
// thin pass-throughs for anyone still calling the old REST API.
// They will work as long as the backend exposes them, but most of
// the app shouldn't need them.
// ─────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  return requestJson<{ message: string; email: string; requiresCode: boolean }>(
    `/auth/login`,
    { method: "POST", body: JSON.stringify({ email, password }) },
    "Login failed"
  );
}

export async function verifyLoginCode(email: string, code: string) {
  return requestJson<{
    token: string;
    message: string;
    user: { id: number; name: string; email: string; emailVerified: boolean };
  }>(
    `/auth/verify-login-code`,
    { method: "POST", body: JSON.stringify({ email, code }) },
    "Code verification failed"
  );
}

export async function resendLoginCode(email: string) {
  return requestJson<{ message: string }>(
    `/auth/resend-login-code`,
    { method: "POST", body: JSON.stringify({ email }) },
    "Failed to resend login code"
  );
}

export async function register(name: string, email: string, password: string) {
  return requestJson<{
    token: string;
    user: { id: number; name: string; email: string; emailVerified: boolean };
  }>(
    `/auth/register`,
    { method: "POST", body: JSON.stringify({ name, email, password }) },
    "Registration failed"
  );
}

export async function verifyEmail(code: string, token?: string, email?: string) {
  return requestJson<{ message: string }>(
    `/auth/verify-email`,
    { method: "POST", body: JSON.stringify({ code, email }), token },
    "Verification failed"
  );
}

export async function resendCode(token: string) {
  return requestJson<{ message: string }>(
    `/auth/resend-code`,
    { method: "POST", token },
    "Failed to resend code"
  );
}

export async function forgotPassword(email: string) {
  return requestJson<{ message: string; email: string }>(
    `/auth/forgot-password`,
    { method: "POST", body: JSON.stringify({ email }) },
    "Failed to send reset code"
  );
}

export async function sendVerification(email: string) {
  return requestJson<{ message: string }>(
    `/auth/send-verification`,
    { method: "POST", body: JSON.stringify({ email }) },
    "Failed to send verification code"
  );
}

export async function resetPassword(email: string, code: string, newPassword: string, confirmPassword?: string) {
  return requestJson<{ message: string }>(
    `/auth/reset-password`,
    { method: "POST", body: JSON.stringify({ email, code, newPassword, confirmPassword }) },
    "Reset failed"
  );
}

// ─────────────────────────────────────────────────────────────
// Tasks & analytics (all gated by Firebase ID token in buildHeaders)
// The `_token` argument is retained for backward compatibility — the
// real bearer is always a fresh Firebase ID token fetched on the fly.
// ─────────────────────────────────────────────────────────────

export async function getTasks(_token: string | undefined, status: "active" | "archived" | "shared" = "active") {
  return requestJson<Task[]>(`/tasks?status=${status}`, { method: "GET" }, "Failed to fetch tasks");
}

export async function getActivityLog(_token?: string) {
  return requestJson<Task[]>(`/tasks/activity`, { method: "GET" }, "Failed to fetch activity log");
}

export async function createTask(
  title: string,
  _token: string | undefined,
  opts?: { description?: string; priority?: string; due_date?: string }
) {
  return requestJson<Task>(
    `/tasks`,
    { method: "POST", body: JSON.stringify({ title, ...opts }) },
    "Failed to create task"
  );
}

export async function deleteTask(id: number, _token?: string) {
  return requestJson<{ message: string }>(`/tasks/${id}`, { method: "DELETE" }, "Failed to delete task");
}

export async function toggleTask(id: number, completed: boolean, _token?: string) {
  return requestJson<Task>(
    `/tasks/${id}`,
    { method: "PATCH", body: JSON.stringify({ completed }) },
    "Failed to update task"
  );
}

export async function updateTask(
  id: number,
  _token: string | undefined,
  fields: { title?: string; description?: string; priority?: Priority; due_date?: string | null }
) {
  return requestJson<Task>(
    `/tasks/${id}`,
    { method: "PATCH", body: JSON.stringify(fields) },
    "Failed to update task"
  );
}

export async function archiveTask(id: number, _token?: string) {
  return requestJson<Task>(`/tasks/${id}/archive`, { method: "PATCH" }, "Failed to archive task");
}

export async function restoreTask(id: number, _token?: string) {
  return requestJson<Task>(`/tasks/${id}/restore`, { method: "PATCH" }, "Failed to restore task");
}

export async function shareTask(id: number, email: string, permission: string, _token?: string) {
  return requestJson<{ success?: boolean } & Record<string, unknown>>(
    `/tasks/${id}/share`,
    { method: "POST", body: JSON.stringify({ email, permission }) },
    "Failed to share task"
  );
}

export async function getCollaborators(id: number, _token?: string) {
  return requestJson<Array<{ id: number; name: string; permission: string }>>(
    `/tasks/${id}/collaborators`,
    { method: "GET" },
    "Failed to fetch collaborators"
  );
}

export async function removeCollaborator(taskId: number, userId: number, _token?: string) {
  return requestJson<{ message: string }>(
    `/tasks/${taskId}/share/${userId}`,
    { method: "DELETE" },
    "Failed to remove collaborator"
  );
}

export async function getStats(_token?: string) {
  return requestJson<Stats>(`/analytics/stats`, { method: "GET" }, "Failed to fetch stats");
}

export async function getNeglected(_token?: string) {
  return requestJson<Task[]>(`/analytics/neglected`, { method: "GET" }, "Failed to fetch neglected");
}

export async function getSuggestions(_token?: string) {
  return requestJson<Task[]>(`/analytics/suggestions`, { method: "GET" }, "Failed to fetch suggestions");
}
