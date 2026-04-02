# Productivity SaaS — Architecture Improvement Plan

**Author:** Architecture Design Document
**Date:** April 2, 2026
**Current Stack:** React + TypeScript + Vite | Node.js + Express | PostgreSQL | JWT | Vercel + Render

---

## Table of Contents

1. [Overview](#1-overview)
2. [Database Schema Updates](#2-database-schema-updates)
3. [Feature 1: Email Verification (6-Digit Code)](#3-feature-1-email-verification)
4. [Feature 2: Task Manager Section (Active Tasks)](#4-feature-2-task-manager-section)
5. [Feature 3: Archived Tasks Section](#5-feature-3-archived-tasks-section)
6. [Feature 4: Shared / Collaborative Tasks](#6-feature-4-shared-collaborative-tasks)
7. [Feature 5: Real-Time Task Updates](#7-feature-5-real-time-task-updates)
8. [Feature 6: Security Improvements](#8-feature-6-security-improvements)
9. [Feature 7: Task Aging Visualization](#9-feature-7-task-aging-visualization)
10. [Feature 8: Productivity Insights](#10-feature-8-productivity-insights)
11. [Recommended Libraries](#11-recommended-libraries)
12. [Frontend Component Architecture](#12-frontend-component-architecture)
13. [Implementation Roadmap](#13-implementation-roadmap)

---

## 1. Overview

This document describes how to evolve the existing task manager from a basic CRUD app into a production-grade SaaS product. The changes are organized so that each feature builds on the previous one, minimizing rework. Every section includes the "why" alongside the "what" so a junior developer can follow the reasoning.

### Architecture Principles

- **Incremental migration** — each feature ships independently; you never have to finish everything before deploying.
- **Backward compatibility** — existing users keep working while new tables and columns are added with sensible defaults.
- **Separation of concerns** — controllers handle HTTP, services handle business logic, models handle SQL.
- **Security by default** — rate limiting, input validation, and proper secrets from the start.

### New Backend Layer: Services

Your current flow is `Route -> Controller -> Model`. Add a **service** layer so controllers stay thin:

```
Route -> Controller -> Service -> Model
```

Create a `src/services/` folder. Each service encapsulates business logic (e.g., sending emails, computing productivity stats) and the controller just calls the service and returns the HTTP response.

---

## 2. Database Schema Updates

### New Tables

Below is the complete SQL migration. Run this against your PostgreSQL database. All new columns use defaults so existing data is preserved.

#### 2.1 Modify `users` Table

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

#### 2.2 Create `email_verification_codes` Table

```sql
CREATE TABLE email_verification_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_verification_user ON email_verification_codes(user_id);
CREATE INDEX idx_verification_code ON email_verification_codes(code);
```

#### 2.3 Modify `tasks` Table

```sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
```

#### 2.4 Create `task_shares` Table

```sql
CREATE TABLE task_shares (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  shared_with_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(10) DEFAULT 'view'
    CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_id, shared_with_user_id)
);

CREATE INDEX idx_task_shares_task ON task_shares(task_id);
CREATE INDEX idx_task_shares_user ON task_shares(shared_with_user_id);
```

#### 2.5 Create `task_activity_log` Table

```sql
CREATE TABLE task_activity_log (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_task ON task_activity_log(task_id);
CREATE INDEX idx_activity_user ON task_activity_log(user_id);
CREATE INDEX idx_activity_created ON task_activity_log(created_at);
```

#### 2.6 Create `notifications` Table

```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  message TEXT NOT NULL,
  related_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
```

### Entity Relationship Summary

```
users (1) ----< (many) tasks
users (1) ----< (many) email_verification_codes
users (1) ----< (many) task_shares (shared_with_user_id)
tasks (1) ----< (many) task_shares
tasks (1) ----< (many) task_activity_log
users (1) ----< (many) notifications
```

---

## 3. Feature 1: Email Verification

### How It Works

1. User registers (existing flow), but `email_verified` starts as `false`.
2. Server generates a random 6-digit code, stores it in `email_verification_codes` with a 10-minute expiry.
3. Server sends the code to the user's email via Nodemailer + a free SMTP service.
4. User enters the code on a verification screen.
5. Server validates the code, sets `email_verified = true`.
6. On login, if `email_verified` is false, redirect to the verification screen instead of the dashboard.

### Backend

#### New Model: `verificationModel.js`

```javascript
// createCode(userId, code, expiresAt)
// INSERT INTO email_verification_codes (user_id, code, expires_at) VALUES ($1, $2, $3) RETURNING *

// findValidCode(userId, code)
// SELECT * FROM email_verification_codes
// WHERE user_id = $1 AND code = $2 AND used = false AND expires_at > NOW()
// ORDER BY created_at DESC LIMIT 1

// markCodeUsed(codeId)
// UPDATE email_verification_codes SET used = true WHERE id = $1
```

#### New Service: `emailService.js`

```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,     // e.g. smtp.gmail.com
  port: process.env.SMTP_PORT,     // 587
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS    // app-specific password
  }
});

export async function sendVerificationEmail(toEmail, code) {
  await transporter.sendMail({
    from: '"TaskFlow" <noreply@yourdomain.com>',
    to: toEmail,
    subject: 'Your verification code',
    html: `<h2>Your code is: <strong>${code}</strong></h2>
           <p>This code expires in 10 minutes.</p>`
  });
}
```

#### New Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/send-verification` | Generate and email a 6-digit code |
| POST | `/auth/verify-email` | Validate the code and mark user verified |
| POST | `/auth/resend-code` | Resend a new code (invalidates old ones) |

#### Updated Auth Flow in `authController.js`

- **Register**: After creating user, auto-generate a code and send it. Return `{ user, token, emailVerified: false }`.
- **Login**: Check `email_verified`. If false, generate a new code, send it, and return `{ requiresVerification: true }` along with the token.

#### Code Generation

```javascript
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
```

### Frontend

#### New Component: `VerifyEmail.tsx`

- Six individual digit inputs that auto-advance focus.
- "Resend code" button with a 60-second cooldown timer.
- On successful verification, redirect to dashboard.

#### Updated Routing in `App.tsx`

```
/               -> Login
/register       -> Register
/verify-email   -> VerifyEmail (new)
/dashboard      -> Dashboard (protected, requires verified email)
```

#### Updated `ProtectedRoute.tsx`

Decode the JWT to check `emailVerified`. If false, redirect to `/verify-email` instead of the dashboard.

### Recommended SMTP Setup

For a free tier suitable for demos, use **Gmail SMTP** with an App Password, or **Resend** (free tier: 100 emails/day). For production, consider **SendGrid** or **AWS SES**.

---

## 4. Feature 2: Task Manager Section (Active Tasks)

### Concept

Active tasks are tasks where `completed = false AND archived = false`. The dashboard should show these prominently as "My Tasks."

### Backend

#### Updated Queries in `taskModel.js`

```javascript
// getActiveTasks(userId)
// SELECT * FROM tasks
// WHERE user_id = $1 AND archived = false
// ORDER BY
//   CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
//   created_at DESC

// getActiveTaskCount(userId)
// SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND archived = false AND completed = false
```

#### New API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tasks?status=active` | Fetch active (non-archived) tasks |
| PATCH | `/tasks/:id` | Update task (title, description, priority, due date) |

### Frontend

#### `TaskManager.tsx` Component

- Displays active tasks grouped by priority (High / Medium / Low).
- Each task card shows: title, description snippet, priority badge, age indicator, due date.
- Filter bar: All / Incomplete / Completed.
- Sort options: Newest, Oldest, Priority, Due Date.

---

## 5. Feature 3: Archived Tasks Section

### Concept

When a user completes a task or manually archives it, the task moves to the archive. Archived tasks can be restored.

### Backend

#### New Queries

```javascript
// archiveTask(userId, taskId)
// UPDATE tasks SET archived = true, archived_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *

// restoreTask(userId, taskId)
// UPDATE tasks SET archived = false, archived_at = NULL WHERE id = $1 AND user_id = $2 RETURNING *

// getArchivedTasks(userId)
// SELECT * FROM tasks WHERE user_id = $1 AND archived = true ORDER BY archived_at DESC

// Auto-archive completed tasks (optional cron or on-toggle):
// UPDATE tasks SET archived = true, archived_at = NOW()
// WHERE user_id = $1 AND completed = true AND archived = false
// AND updated_at < NOW() - INTERVAL '7 days'
```

#### New API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tasks?status=archived` | Fetch archived tasks |
| PATCH | `/tasks/:id/archive` | Archive a task |
| PATCH | `/tasks/:id/restore` | Restore an archived task |

### Frontend

#### `ArchivedTasks.tsx` Component

- Separate tab or page showing archived tasks.
- Each card shows: title, when it was archived, a "Restore" button.
- Search/filter within archived tasks.
- Bulk actions: restore selected, permanently delete selected.

### Auto-Archive Logic

Optionally, when a user marks a task as completed, start a 7-day timer. After 7 days, auto-archive it. Implement this with a simple scheduled query (pg_cron on Render, or a lightweight cron job in your Express app using `node-cron`).

---

## 6. Feature 4: Shared / Collaborative Tasks

### Concept

A user can share a task with another user by email. The other user gets "view" or "edit" permission. Shared tasks appear in a "Shared with Me" section.

### Backend

#### New Model: `shareModel.js`

```javascript
// shareTask(taskId, sharedWithUserId, permission)
// INSERT INTO task_shares (task_id, shared_with_user_id, permission)
// VALUES ($1, $2, $3)
// ON CONFLICT (task_id, shared_with_user_id) DO UPDATE SET permission = $3
// RETURNING *

// getSharedWithMe(userId)
// SELECT t.*, ts.permission, u.name as owner_name
// FROM task_shares ts
// JOIN tasks t ON t.id = ts.task_id
// JOIN users u ON u.id = t.user_id
// WHERE ts.shared_with_user_id = $1 AND t.archived = false
// ORDER BY ts.created_at DESC

// getTaskCollaborators(taskId)
// SELECT u.id, u.name, u.email, ts.permission
// FROM task_shares ts
// JOIN users u ON u.id = ts.shared_with_user_id
// WHERE ts.task_id = $1

// removeShare(taskId, userId)
// DELETE FROM task_shares WHERE task_id = $1 AND shared_with_user_id = $2
```

#### Authorization Middleware: `taskAuthMiddleware.js`

Before allowing edits to a shared task, check that the user either owns the task or has `edit` permission:

```javascript
export async function canEditTask(req, res, next) {
  const { id } = req.params;
  const userId = req.user.id;

  // Check ownership
  const task = await findTaskById(id);
  if (task.user_id === userId) return next();

  // Check share permission
  const share = await findShare(id, userId);
  if (share && share.permission === 'edit') return next();

  return res.status(403).json({ error: 'Not authorized to edit this task' });
}
```

#### New API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/tasks/:id/share` | Share a task with another user (by email) |
| GET | `/tasks/shared-with-me` | Get tasks shared with the current user |
| GET | `/tasks/:id/collaborators` | List collaborators on a task |
| DELETE | `/tasks/:id/share/:userId` | Remove a collaborator |
| PATCH | `/tasks/:id/share/:userId` | Update collaborator permission |

### Frontend

#### `SharedTasks.tsx` Component

- "Shared with Me" tab showing tasks others have shared.
- Badge showing permission level (view / edit).
- Owner name displayed on each card.

#### `ShareModal.tsx` Component

- Modal triggered by a "Share" button on any task card.
- Input field for collaborator's email.
- Permission dropdown: View / Edit.
- List of current collaborators with remove buttons.

---

## 7. Feature 5: Real-Time Task Updates

### Concept

When a shared task is modified, all collaborators see the change immediately without refreshing. Use **Socket.IO** for WebSocket connections.

### Backend

#### Setup: `socket.js`

```javascript
import { Server } from 'socket.io';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true }
  });

  // Authenticate socket connections using JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    // Join a personal room for notifications
    socket.join(`user:${socket.userId}`);

    // Join rooms for each task the user owns or collaborates on
    socket.on('join-task', (taskId) => {
      socket.join(`task:${taskId}`);
    });

    socket.on('leave-task', (taskId) => {
      socket.leave(`task:${taskId}`);
    });
  });

  return io;
}
```

#### Emitting Events

In your task controllers, after any mutation, emit events:

```javascript
// After updating a task
io.to(`task:${taskId}`).emit('task:updated', { task: updatedTask });

// After sharing a task
io.to(`user:${sharedWithUserId}`).emit('task:shared', { task, sharedBy: userName });

// After deleting a task
io.to(`task:${taskId}`).emit('task:deleted', { taskId });
```

#### Modifying `server.js`

```javascript
import http from 'http';
import { initSocket } from './socket.js';

const server = http.createServer(app);
const io = initSocket(server);

// Make io accessible in controllers
app.set('io', io);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### Frontend

#### `useSocket.ts` Custom Hook

```typescript
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(token: string) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL, {
      auth: { token }
    });

    socketRef.current = socket;

    return () => { socket.disconnect(); };
  }, [token]);

  return socketRef;
}
```

#### Integrating with Dashboard

```typescript
// In Dashboard.tsx or a context provider
const socket = useSocket(token);

useEffect(() => {
  if (!socket.current) return;

  socket.current.on('task:updated', (data) => {
    setTasks(prev => prev.map(t => t.id === data.task.id ? data.task : t));
  });

  socket.current.on('task:shared', (data) => {
    // Show notification toast and refresh shared tasks
  });

  socket.current.on('task:deleted', (data) => {
    setTasks(prev => prev.filter(t => t.id !== data.taskId));
  });
}, [socket]);
```

### Deployment Note

Socket.IO works on Render's free tier (they support WebSockets). Make sure to set the `FRONTEND_URL` env var for CORS.

---

## 8. Feature 6: Security Improvements

### 8.1 Rate Limiting

Install `express-rate-limit`:

```javascript
import rateLimit from 'express-rate-limit';

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                    // 100 requests per window
  message: { error: 'Too many requests, please try again later' }
});

// Strict limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,                     // 10 attempts per 15 min
  message: { error: 'Too many login attempts' }
});

app.use('/tasks', apiLimiter);
app.use('/auth', authLimiter);
```

### 8.2 Input Validation

Install `express-validator`:

```javascript
import { body, validationResult } from 'express-validator';

// Example: validate registration
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().isLength({ min: 1, max: 100 })
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}, register);
```

### 8.3 Helmet (Security Headers)

```javascript
import helmet from 'helmet';
app.use(helmet());
```

This sets headers like `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, and more.

### 8.4 CORS Tightening

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,  // Only your Vercel domain
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 8.5 Stronger JWT Secret

Replace `mysecretkey123` with a proper secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Store the output in your `.env` as `JWT_SECRET`.

### 8.6 SQL Injection Prevention

Your current code already uses parameterized queries (`$1`, `$2`), which is correct. Keep doing this for all new queries. Never interpolate user input into SQL strings.

### 8.7 Environment Variable Validation

At app startup, validate that all required env vars exist:

```javascript
const required = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'JWT_SECRET', 'SMTP_HOST'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}
```

---

## 9. Feature 7: Task Aging Visualization

### Concept

Each task card changes color based on how long it has been open (not completed). This creates a visual urgency system.

### Age Calculation (Frontend)

```typescript
type AgeLevel = 'fresh' | 'normal' | 'aging' | 'stale' | 'critical';

function getTaskAge(createdAt: string, completed: boolean): AgeLevel {
  if (completed) return 'fresh'; // completed tasks are always neutral

  const now = new Date();
  const created = new Date(createdAt);
  const hoursOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  if (hoursOld < 24) return 'fresh';       // < 1 day
  if (hoursOld < 72) return 'normal';       // 1-3 days
  if (hoursOld < 168) return 'aging';       // 3-7 days
  if (hoursOld < 336) return 'stale';       // 1-2 weeks
  return 'critical';                         // > 2 weeks
}
```

### CSS Styling

```css
/* Task card age indicators */
.task-card { transition: all 0.3s ease; border-left: 4px solid transparent; }

.task-card[data-age="fresh"]    { border-left-color: #10b981; background: #f0fdf4; }
.task-card[data-age="normal"]   { border-left-color: #6b7280; background: #ffffff; }
.task-card[data-age="aging"]    { border-left-color: #f59e0b; background: #fffbeb; }
.task-card[data-age="stale"]    { border-left-color: #f97316; background: #fff7ed; }
.task-card[data-age="critical"] { border-left-color: #ef4444; background: #fef2f2; }
```

### Task Card Component

```tsx
function TaskCard({ task }: { task: Task }) {
  const age = getTaskAge(task.created_at, task.completed);

  const ageLabels: Record<AgeLevel, string> = {
    fresh: 'New',
    normal: '',
    aging: 'Getting old',
    stale: 'Needs attention',
    critical: 'Overdue!'
  };

  return (
    <div className="task-card" data-age={age}>
      <div className="task-header">
        <h3>{task.title}</h3>
        {ageLabels[age] && <span className={`age-badge age-${age}`}>{ageLabels[age]}</span>}
      </div>
      <p className="task-meta">Created {formatRelativeTime(task.created_at)}</p>
    </div>
  );
}
```

### Optional: Pulse Animation for Critical Tasks

```css
@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
}

.task-card[data-age="critical"] {
  animation: pulse-red 2s infinite;
}
```

---

## 10. Feature 8: Productivity Insights

### Backend: Analytics Service

Create `src/services/analyticsService.js`:

```javascript
// Get productivity stats for a user
export async function getProductivityStats(userId) {
  const result = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE completed = false AND archived = false) AS active_tasks,
      COUNT(*) FILTER (WHERE completed = true) AS completed_tasks,
      COUNT(*) FILTER (WHERE completed = true AND updated_at > NOW() - INTERVAL '7 days') AS completed_this_week,
      COUNT(*) FILTER (WHERE completed = false AND created_at < NOW() - INTERVAL '7 days' AND archived = false) AS stale_tasks,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600)
        FILTER (WHERE completed = true AND updated_at > NOW() - INTERVAL '30 days')
        AS avg_completion_hours
    FROM tasks WHERE user_id = $1
  `, [userId]);
  return result.rows[0];
}

// Get neglected tasks (open > 7 days with no activity)
export async function getNeglectedTasks(userId) {
  return pool.query(`
    SELECT t.* FROM tasks t
    LEFT JOIN task_activity_log l ON l.task_id = t.id
      AND l.created_at > NOW() - INTERVAL '3 days'
    WHERE t.user_id = $1
      AND t.completed = false
      AND t.archived = false
      AND t.created_at < NOW() - INTERVAL '7 days'
      AND l.id IS NULL
    ORDER BY t.created_at ASC
    LIMIT 5
  `, [userId]);
}

// Get prioritization suggestions
export async function getPrioritySuggestions(userId) {
  return pool.query(`
    SELECT * FROM tasks
    WHERE user_id = $1
      AND completed = false
      AND archived = false
    ORDER BY
      CASE
        WHEN due_date IS NOT NULL AND due_date < NOW() + INTERVAL '2 days' THEN 1
        WHEN priority = 'high' THEN 2
        WHEN created_at < NOW() - INTERVAL '5 days' AND priority = 'medium' THEN 3
        ELSE 4
      END,
      due_date ASC NULLS LAST
    LIMIT 5
  `, [userId]);
}
```

### API Route

| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics/stats` | Get productivity overview |
| GET | `/analytics/neglected` | Get neglected tasks |
| GET | `/analytics/suggestions` | Get priority suggestions |

### Frontend: `ProductivityPanel.tsx`

```tsx
function ProductivityPanel({ stats, neglected, suggestions }) {
  return (
    <div className="productivity-panel">
      {/* Stats Row */}
      <div className="stats-grid">
        <StatCard label="Active Tasks" value={stats.active_tasks} />
        <StatCard label="Completed This Week" value={stats.completed_this_week} />
        <StatCard label="Avg Completion Time" value={`${Math.round(stats.avg_completion_hours)}h`} />
        <StatCard label="Completion Rate" value={`${completionRate}%`} />
      </div>

      {/* Neglected Tasks Alert */}
      {neglected.length > 0 && (
        <div className="insight-card warning">
          <h4>Needs Attention</h4>
          <p>You have {neglected.length} tasks that haven't had activity in over a week:</p>
          <ul>
            {neglected.map(t => <li key={t.id}>{t.title} — {daysOld(t.created_at)} days old</li>)}
          </ul>
        </div>
      )}

      {/* Priority Suggestions */}
      {suggestions.length > 0 && (
        <div className="insight-card info">
          <h4>Suggested Focus</h4>
          <p>Based on due dates and priority, consider tackling these next:</p>
          <ol>
            {suggestions.map(t => (
              <li key={t.id}>
                <strong>{t.title}</strong>
                {t.due_date && <span> — due {formatDate(t.due_date)}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
```

### Insight Types

The system generates these insight categories:

1. **Stale Task Alerts** — tasks open > 7 days with no recent activity.
2. **Priority Suggestions** — what to work on next based on due dates and priority levels.
3. **Completion Velocity** — how many tasks completed this week vs. last week.
4. **Streak Tracking** — consecutive days with at least one task completed.

---

## 11. Recommended Libraries

### Backend (add to `package.json`)

| Library | Purpose | Install |
|---------|---------|---------|
| `socket.io` | Real-time WebSocket communication | `npm i socket.io` |
| `nodemailer` | Send verification emails | `npm i nodemailer` |
| `express-rate-limit` | Rate limiting | `npm i express-rate-limit` |
| `express-validator` | Input validation | `npm i express-validator` |
| `helmet` | Security headers | `npm i helmet` |
| `node-cron` | Scheduled tasks (auto-archive) | `npm i node-cron` |
| `morgan` | HTTP request logging | `npm i morgan` |

### Frontend (add to `package.json`)

| Library | Purpose | Install |
|---------|---------|---------|
| `socket.io-client` | WebSocket client | `npm i socket.io-client` |
| `react-hot-toast` | Toast notifications | `npm i react-hot-toast` |
| `date-fns` | Date formatting and calculations | `npm i date-fns` |
| `framer-motion` | Smooth animations | `npm i framer-motion` |
| `lucide-react` | Clean icon set | `npm i lucide-react` |

---

## 12. Frontend Component Architecture

### Updated Component Tree

```
App.tsx
├── Login.tsx
├── Register.tsx
├── VerifyEmail.tsx                 (NEW - email verification)
├── ProtectedRoute.tsx              (UPDATED - checks email_verified)
└── DashboardLayout.tsx             (NEW - shared layout with sidebar)
    ├── Sidebar.tsx                 (NEW - navigation)
    ├── ProductivityPanel.tsx       (NEW - insights dashboard)
    ├── TaskManager.tsx             (NEW - active tasks view)
    │   ├── TaskCard.tsx            (NEW - individual task with aging)
    │   ├── TaskFilters.tsx         (NEW - filter/sort controls)
    │   └── CreateTaskForm.tsx      (EXTRACTED from Dashboard)
    ├── ArchivedTasks.tsx           (NEW - archived tasks view)
    ├── SharedTasks.tsx             (NEW - shared with me view)
    │   └── ShareModal.tsx          (NEW - share a task modal)
    └── NotificationCenter.tsx      (NEW - real-time notifications)
```

### State Management

For this level of complexity, React Context is sufficient. Create these contexts:

```
AuthContext       — user info, token, email verification status
TaskContext       — active tasks, archived tasks, shared tasks, CRUD operations
SocketContext     — WebSocket connection, event listeners
NotificationContext — toast messages, unread count
```

### Suggested Page Layout

```
+----------------------------------------------------------+
|  Logo    [Task Manager] [Archive] [Shared]    [User Menu] |
+----------+-----------------------------------------------+
|          |  Productivity Insights (collapsible)           |
| Sidebar  |  +-------------------------------------------+ |
|          |  | Stats | Neglected | Suggestions            | |
|          |  +-------------------------------------------+ |
| - My     |                                               |
|   Tasks  |  Task List                                    |
| - Archive|  +-------------------------------------------+ |
| - Shared |  | [Filter: All/Active/Done] [Sort: ▼]       | |
| - Insights  | Task Card (with age color)                | |
|          |  | Task Card (with age color)                 | |
|          |  | Task Card (with age color)                 | |
|          |  +-------------------------------------------+ |
+----------+-----------------------------------------------+
```

---

## 13. Implementation Roadmap

Build these in order. Each phase is independently deployable.

### Phase 1: Foundation (Week 1)

1. Add the service layer (`src/services/` folder).
2. Run the database migrations (new columns and tables).
3. Add `helmet`, `express-rate-limit`, `express-validator`, `morgan`.
4. Generate a proper JWT secret and update `.env`.
5. Tighten CORS to your Vercel domain.
6. Add environment variable validation on startup.

### Phase 2: Email Verification (Week 2)

1. Install `nodemailer`, configure SMTP.
2. Build `verificationModel.js` and `emailService.js`.
3. Add the three new auth routes.
4. Update `authController.js` to handle verification flow.
5. Build `VerifyEmail.tsx` on the frontend.
6. Update `ProtectedRoute.tsx` to check verification status.

### Phase 3: Task Manager + Archive (Week 3)

1. Add `description`, `archived`, `priority`, `due_date` columns to tasks.
2. Update `taskModel.js` with new queries for active/archived tasks.
3. Add archive/restore routes.
4. Build `TaskManager.tsx`, `TaskCard.tsx`, `ArchivedTasks.tsx`.
5. Implement task aging visualization (CSS + utility function).
6. Build the `DashboardLayout.tsx` with sidebar navigation.

### Phase 4: Sharing + Real-Time (Week 4)

1. Create `task_shares` and `notifications` tables.
2. Build `shareModel.js` and the sharing routes.
3. Build `taskAuthMiddleware.js` for permission checks.
4. Install `socket.io` / `socket.io-client`.
5. Build `socket.js` on backend, `useSocket.ts` hook on frontend.
6. Wire up real-time events for task mutations.
7. Build `SharedTasks.tsx`, `ShareModal.tsx`, `NotificationCenter.tsx`.

### Phase 5: Productivity Insights (Week 5)

1. Create `task_activity_log` table.
2. Log activity in task controllers (create, complete, archive, share).
3. Build `analyticsService.js` with stat queries.
4. Add analytics API routes.
5. Build `ProductivityPanel.tsx` on frontend.
6. Optional: Add `node-cron` for auto-archiving completed tasks after 7 days.

### Phase 6: Polish (Week 6)

1. Add loading skeletons for all new sections.
2. Add error boundaries and proper error handling.
3. Implement `framer-motion` animations for task transitions.
4. Add toast notifications with `react-hot-toast`.
5. Test all flows end-to-end.
6. Write a clean README with setup instructions, screenshots, and a demo link.

---

## Summary of All New API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/send-verification` | Yes | Send 6-digit code to email |
| POST | `/auth/verify-email` | Yes | Verify the code |
| POST | `/auth/resend-code` | Yes | Resend verification code |
| GET | `/tasks?status=active` | Yes | Get active tasks |
| GET | `/tasks?status=archived` | Yes | Get archived tasks |
| PATCH | `/tasks/:id` | Yes | Update task details |
| PATCH | `/tasks/:id/archive` | Yes | Archive a task |
| PATCH | `/tasks/:id/restore` | Yes | Restore archived task |
| POST | `/tasks/:id/share` | Yes | Share task with user |
| GET | `/tasks/shared-with-me` | Yes | Get tasks shared with you |
| GET | `/tasks/:id/collaborators` | Yes | List task collaborators |
| DELETE | `/tasks/:id/share/:userId` | Yes | Remove collaborator |
| PATCH | `/tasks/:id/share/:userId` | Yes | Update share permission |
| GET | `/analytics/stats` | Yes | Productivity overview |
| GET | `/analytics/neglected` | Yes | Neglected tasks list |
| GET | `/analytics/suggestions` | Yes | Priority suggestions |

---

## New Backend File Structure

```
backend/src/
├── app.js                    (UPDATED - add helmet, rate limit, validators)
├── server.js                 (UPDATED - http.createServer + socket.io)
├── socket.js                 (NEW)
├── config/
│   └── db.js
├── controllers/
│   ├── authController.js     (UPDATED - verification flow)
│   ├── taskController.js     (UPDATED - archive, share, filter)
│   └── analyticsController.js (NEW)
├── middleware/
│   ├── authMiddleware.js
│   ├── taskAuthMiddleware.js  (NEW - share permission checks)
│   └── validators.js          (NEW - express-validator rules)
├── models/
│   ├── userModel.js           (UPDATED - email_verified)
│   ├── taskModel.js           (UPDATED - archive, filter queries)
│   ├── verificationModel.js   (NEW)
│   ├── shareModel.js          (NEW)
│   ├── activityModel.js       (NEW)
│   └── notificationModel.js   (NEW)
├── services/
│   ├── emailService.js        (NEW)
│   └── analyticsService.js    (NEW)
└── routes/
    ├── authRoutes.js          (UPDATED)
    ├── taskRoutes.js          (UPDATED)
    └── analyticsRoutes.js     (NEW)
```
