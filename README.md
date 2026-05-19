# Productivity SaaS

[![CI](https://github.com/bedo-48/productivity-saas/actions/workflows/ci.yml/badge.svg)](https://github.com/bedo-48/productivity-saas/actions/workflows/ci.yml)

A full-stack task manager with a paper-notebook aesthetic — real-time sharing, productivity insights, and a half-open notebook auth flow.

**Live:** https://productivity-saas-silk.vercel.app

## Features

- Email + Google sign-in (Firebase Auth), with email verification and password reset
- Tasks with priority, due date, archive, share (view / edit)
- Real-time updates via Socket.IO — collaborators see changes instantly
- Productivity insights: completion rate, stale tasks, weekly trends, streak
- Four views on the same data: **Today**, **Kanban**, **Calendar**, **Focus** (25-min timer), **Stats**

## Stack

| Layer    | Tech                                                      |
|----------|-----------------------------------------------------------|
| Frontend | React 19, TypeScript, Vite, React Router, Socket.IO client |
| Backend  | Node.js, Express 5, Socket.IO, Firebase Admin, Resend     |
| DB       | PostgreSQL                                                |
| Hosting  | Vercel (frontend) + Render (backend)                      |

## Run locally

```bash
# backend
cd backend
npm install
cp .env.example .env   # fill in Firebase + Postgres + Resend keys
npm run dev

# frontend (new terminal)
cd frontend
npm install
cp .env.example .env   # fill in VITE_API_URL + VITE_FIREBASE_*
npm run dev
```

## CI

Every push runs lint, TypeScript type-check, and Vite production build on the frontend; `node --check` on every backend `.js` file. See [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

## Architecture notes

- `frontend/src/components/dashboard/` — composable pieces of the dashboard (Topbar, InsightsBand, SidebarRail, TaskRow, StickyRail, ShareModal, ToastStack)
- `frontend/src/styles/notebook-tokens.css` — single source of truth for colours, type and paper textures
- `frontend/src/components/HalfOpenNotebook.tsx` — the signature 3D notebook visual
- Backend route layout: `routes/` → `controllers/` → `models/`
- See [`ARCHITECTURE_PLAN.md`](./ARCHITECTURE_PLAN.md) for the longer-term roadmap
