const API = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

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

async function readPayload(res: Response): Promise<ApiErrorPayload & Record<string, unknown>> {
  return res.json().catch(() => ({}));
}

async function requestJson<T>(input: string, init: RequestInit, fallbackMessage: string): Promise<T> {
  if (!API) {
    throw new ApiError(
      "The frontend API URL is missing. Set VITE_API_URL before using authentication.",
      500,
      { code: "API_URL_MISSING", details: "VITE_API_URL is not configured." }
    );
  }

  let res: Response;

  try {
    res = await fetch(input, init);
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

export async function login(email: string, password: string) {
  return requestJson<{ message: string; email: string; requiresCode: boolean }>(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }, "Login failed");
}

export async function verifyLoginCode(email: string, code: string) {
  return requestJson<{ token: string; message: string; user: { id: number; name: string; email: string; emailVerified: boolean } }>(
    `${API}/auth/verify-login-code`,
    {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
    },
    "Code verification failed"
  );
}

export async function resendLoginCode(email: string) {
  return requestJson<{ message: string }>(`${API}/auth/resend-login-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }, "Failed to resend login code");
}

export async function register(name: string, email: string, password: string) {
  return requestJson<{ token: string; user: { id: number; name: string; email: string; emailVerified: boolean } }>(
    `${API}/auth/register`,
    {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
    },
    "Registration failed"
  );
}

export async function verifyEmail(code: string, token?: string, email?: string) {
  return requestJson<{ message: string }>(`${API}/auth/verify-email`, {
    method: "POST",
    headers: token ? authHeader(token) : { "Content-Type": "application/json" },
    body: JSON.stringify({ code, email }),
  }, "Verification failed");
}

export async function resendCode(token: string) {
  return requestJson<{ message: string }>(`${API}/auth/resend-code`, {
    method: "POST",
    headers: authHeader(token),
  }, "Failed to resend code");
}

export async function forgotPassword(email: string) {
  return requestJson<{ message: string; email: string }>(`${API}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }, "Failed to send reset code");
}

export async function sendVerification(email: string) {
  return requestJson<{ message: string }>(`${API}/auth/send-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }, "Failed to send verification code");
}

export async function resetPassword(email: string, code: string, newPassword: string, confirmPassword?: string) {
  return requestJson<{ message: string }>(`${API}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, newPassword, confirmPassword }),
  }, "Reset failed");
}

export async function getTasks(token: string, status: "active" | "archived" | "shared" = "active") {
  const res = await fetch(`${API}/tasks?status=${status}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

export async function getActivityLog(token: string) {
  const res = await fetch(`${API}/tasks/activity`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch activity log");
  return res.json();
}

export async function createTask(
  title: string,
  token: string,
  opts?: { description?: string; priority?: string; due_date?: string }
) {
  const res = await fetch(`${API}/tasks`, {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({ title, ...opts }),
  });
  if (!res.ok) throw new Error("Failed to create task");
  return res.json();
}

export async function deleteTask(id: number, token: string) {
  const res = await fetch(`${API}/tasks/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete task");
}

export async function toggleTask(id: number, completed: boolean, token: string) {
  const res = await fetch(`${API}/tasks/${id}`, {
    method: "PATCH",
    headers: authHeader(token),
    body: JSON.stringify({ completed }),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

export async function updateTask(
  id: number,
  token: string,
  fields: { title?: string; description?: string; priority?: string; due_date?: string | null }
) {
  const res = await fetch(`${API}/tasks/${id}`, {
    method: "PATCH",
    headers: authHeader(token),
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

export async function archiveTask(id: number, token: string) {
  const res = await fetch(`${API}/tasks/${id}/archive`, {
    method: "PATCH",
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error("Failed to archive task");
  return res.json();
}

export async function restoreTask(id: number, token: string) {
  const res = await fetch(`${API}/tasks/${id}/restore`, {
    method: "PATCH",
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error("Failed to restore task");
  return res.json();
}

export async function shareTask(id: number, email: string, permission: string, token: string) {
  const res = await fetch(`${API}/tasks/${id}/share`, {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({ email, permission }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to share task");
  }
  return res.json();
}

export async function getCollaborators(id: number, token: string) {
  const res = await fetch(`${API}/tasks/${id}/collaborators`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch collaborators");
  return res.json();
}

export async function removeCollaborator(taskId: number, userId: number, token: string) {
  const res = await fetch(`${API}/tasks/${taskId}/share/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to remove collaborator");
}

export async function getStats(token: string) {
  const res = await fetch(`${API}/analytics/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function getNeglected(token: string) {
  const res = await fetch(`${API}/analytics/neglected`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch neglected");
  return res.json();
}

export async function getSuggestions(token: string) {
  const res = await fetch(`${API}/analytics/suggestions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch suggestions");
  return res.json();
}
