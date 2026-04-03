const API = import.meta.env.VITE_API_URL;

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ── AUTH ─────────────────────────────────────────────────────
export async function login(email: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Login failed");
  }
  return res.json();
}

export async function register(name: string, email: string, password: string) {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Registration failed");
  }
  return res.json();
}

export async function verifyEmail(code: string, token: string) {
  const res = await fetch(`${API}/auth/verify-email`, {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Verification failed");
  }
  return res.json();
}

export async function resendCode(token: string) {
  const res = await fetch(`${API}/auth/resend-code`, {
    method: "POST",
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error("Failed to resend code");
  return res.json();
}

// ── TASKS ────────────────────────────────────────────────────
export async function getTasks(token: string, status: "active" | "archived" | "shared" = "active") {
  const res = await fetch(`${API}/tasks?status=${status}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch tasks");
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

// ── ANALYTICS ────────────────────────────────────────────────
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
