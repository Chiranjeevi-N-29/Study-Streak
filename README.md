# 🔥 StudyStreak

> **Plan your learning. Build your streak. Master consistency.**

StudyStreak is a full-stack, production-grade study planning, focus tracking, and accountability application designed to help learners convert ambitious study goals into daily actionable habits, maintain deterministic study streaks, collaborate in private accountability groups, and analyze long-term learning performance over time.

---

## 📋 Overview

Learning complex technical subjects requires consistency over intensity. Most productivity apps either lack dedicated study-focused workflow engines or rely on invasive social feeds.

StudyStreak solves this by combining:
1. **Intelligent Workload Planning**: Deterministic weekly schedule recommendation engine based on daily capacity and task priorities.
2. **Deterministic Streak Engine**: Explicit business logic handling study completion, rest days, timezone boundaries, and backfilled missed days.
3. **Persistent Focus Tracking**: Server-authoritative focus sessions with pause/resume support, automatic task progress sync, and target focus time tracking.
4. **Privacy-First Accountability Groups**: Small private groups (2–20 members) focused strictly on shared goal progress, leaderboards, and group streaks — zero social media distraction.
5. **Advanced Analytics & Reports**: Multi-range trend reports (`7d`, `30d`, `90d`, `all`), automated deterministic insights, and authenticated JSON/CSV data export.

---

## ✨ Key Features

### 🔐 1. Authentication & Security
- Secure registration and login with bcrypt password hashing.
- HTTP-only, `SameSite=Strict` JWT authentication cookies preventing XSS and CSRF token theft.
- Role-based authorization and strict user data isolation (IDOR protection on all endpoints).

### 📅 2. Daily Study Planning & Task Management
- Daily study plan creation for any date with automated progress status (`TODO`, `IN_PROGRESS`, `COMPLETED`, `PARTIALLY_COMPLETED`, `NOT_COMPLETED`, `REST_DAY`).
- Granular task details: title, category, priority (`LOW`, `MEDIUM`, `HIGH`), estimated vs. actual duration, linked long-term goal, and drag-free reordering.

### 🔥 3. Deterministic Streak Engine
- Automatic calculation of current streak, longest streak, and last active study date.
- Business rules: `COMPLETED` and `PARTIALLY_COMPLETED` plans qualify as successful study days; `REST_DAY` preserves consecutive streaks without penalty; unfulfilled past days evaluate to `MISSED`.

### ⏱️ 4. Persistent Focus Sessions
- Live Pomodoro / custom study timer with `START`, `PAUSE`, `RESUME`, `CANCEL`, and `COMPLETE` actions.
- Server-authoritative timing calculating net active duration excluding paused intervals.
- Automatic completion integration: updates task `actualDuration`, plan status, goal focus minutes, group goal contributions, user achievements, and study streaks.

### 📆 5. Study Calendar & History
- Visual month-grid calendar mapping daily study status (Completed 🟢, Partial 🟡, Rest Day 🌴, Missed 🔴, Future 🔵).
- Inspect past study plans, modify task outcomes retroactively, or toggle rest days.

### 🎯 6. Long-Term Study Goals
- Define long-term learning objectives with target hours, target completion dates, categories, and color tags.
- Direct linking between daily tasks, focus sessions, and long-term goal progress bars.

### 📚 7. Intelligent Study Planner & Schedule Builder
- Visual 7-day weekly planning grid displaying daily scheduled workload and capacity bars.
- Rule-based, explainable recommendation dialog suggesting optimal study days for unassigned tasks based on capacity and priority.
- Workload capacity meter showing real-time fill level (green → amber → red).

### 👥 8. Study Groups & Accountability
- Small private study groups (2–20 members) created or joined via cryptographically secure 10-character invite codes.
- Fine-grained membership roles (`OWNER`, `ADMIN`, `MEMBER`) supporting owner transfer, member management, and goal management.
- Explicit focus session opt-in for group goals; individual tasks, notes, and private reflections remain 100% private.
- Group streak engine (incremented when at least one member contributes focus time to a group goal on a calendar date) and 7-day focus minutes leaderboard.

### 📊 9. Advanced Reports & Data Export
- Comprehensive learning report dashboard supporting preset (`7d`, `30d`, `90d`, `All Time`) and custom date ranges.
- Breakdown cards: Study Time Trends, Category Distribution, Task Performance by Priority/Tag, Goal Progress, Plan Performance, and Automated Rule-Based Insights.
- Authenticated dataset exports (`Tasks`, `Focus Sessions`, `Study History`, `Study Goals`, `Full Backup`) in `JSON` or `CSV` format with sensitive field sanitization.

### 💭 10. Reflections & Learning Journal
- End-of-day reflection entries tracking key takeaways, difficulties encountered, and improvement goals for tomorrow.

### 🏆 11. Achievements & Gamification
- Dynamic, idempotent achievement evaluation engine awarding badges for streak milestones, study hour totals, completed tasks, and reflection consistency.

### 🔔 12. Smart Notifications & Reminders
- Timezone-aware notification engine delivering daily study reminders, streak warning alerts, achievement unlocked toasts, and group goal milestone notifications.

### 📱 13. PWA & Offline Support
- Installable Desktop & Mobile Progressive Web App with Web App Manifest and custom icons.
- Production Service Worker (`sw.js`) implementing static asset caching, offline fallback routing for SPA navigation, and authenticated `/api/*` cache isolation.

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           React 18 SPA                                  │
│       Vite + TypeScript + Vanilla CSS + Context API + Service Worker     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     │ HTTPS / HTTP-Only Cookies
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Express API Backend (Node.js)                      │
│                                                                         │
│  [ Helmet ] ──► [ Rate Limiter ] ──► [ Request ID ] ──► [ Auth Guard ]  │
│  [ Zod Validation ] ──► [ Controller Layer ] ──► [ Business Services ] │
│  (Auth | Plan | Task | Streak | Focus | Group | Report | Export | PWA)  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     │ Prisma ORM (Parameterized Queries)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       PostgreSQL 16 Database                            │
│  Users | Profiles | StudyPlans | StudyTasks | FocusSessions | Streaks   │
│  StudyGoals | StudyGroups | GroupMembers | GroupGoals | Achievements   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, React Router DOM v6, Vanilla CSS (CSS Variables, Flexbox/Grid), Service Worker PWA |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, Zod, Bcrypt, JsonWebToken, Helmet, Express Rate Limit |
| **Database** | PostgreSQL 16 |
| **Testing** | Vitest, Supertest, React Testing Library, jsdom |
| **Containerization & CI** | Docker, Docker Compose, Nginx Alpine, GitHub Actions CI |

---

## 🧪 Automated Testing & Verification

StudyStreak includes comprehensive backend and frontend test suites built with **Vitest**:

```bash
# Run backend test suite (136 tests passing)
npm test -w backend

# Run frontend test suite (68 tests passing)
npm test -w frontend

# Run complete quality pipeline (Typecheck + Lint + Tests + Build)
npm run check
```

### Test Metrics Summary
- **Backend Test Coverage**: 136 tests across 21 test suites (Unit + Supertest API Integration tests).
- **Frontend Test Coverage**: 68 tests across 15 test suites (React Testing Library component & routing tests).
- **Total Test Count**: **204 passing tests** across **36 test files** (0 failures).
- **Type Safety**: Clean TypeScript compilation (`npx tsc --noEmit` & `npx tsc -b`) with zero errors.

---

## 🔒 Security Practices

- **Zero Secret Exposure**: All environment secrets (`JWT_SECRET`, `DATABASE_URL`) are read via environment variables validated by Zod at startup.
- **HTTP-Only Cookies**: JWT tokens are delivered in HTTP-only, `SameSite=Strict` secure cookies to prevent client-side script access.
- **Strict Authorization**: Every resource lookup queries by primary key AND `userId` to eliminate IDOR (Insecure Direct Object Reference) vulnerabilities.
- **Rate Limiting**: Dedicated rate limiting for authentication attempts (10 req / 15 min) and API endpoints (200 req / 15 min).
- **Security Headers**: Integrated `helmet` middleware enforcing security headers.
- **Production Sanitization**: Stack traces are stripped from API error responses when running in production mode.

---

## 💻 Local Setup & Development

### Prerequisites
- **Node.js**: v20+ recommended
- **PostgreSQL**: v16+ (or run via Docker)

### Installation & Initialization

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Chiranjeevi-N-29/Study-Streak.git
   cd Study-Streak
   ```

2. **Install workspace dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` in the project root:
   ```bash
   cp .env.example .env
   ```

   Sample `.env` configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/studystreak?schema=public"
   JWT_SECRET="dev_secret_key_change_in_production"
   FRONTEND_URL="http://localhost:5173"
   ```

4. **Run Database Migrations & Seed Data**:
   ```bash
   # Run Prisma migrations
   npx prisma migrate dev --schema=backend/prisma/schema.prisma

   # Seed initial achievement definitions
   npm run db:seed -w backend
   ```

5. **Start Local Development Servers**:
   ```bash
   # Starts backend API on port 5000 and Vite frontend on port 5173 concurrently
   npm run dev
   ```

---

## 🐳 Docker Production Deployment

Run the complete StudyStreak stack (PostgreSQL + Express API Backend + Nginx Static Frontend) with a single command:

```bash
docker-compose up -d --build
```

### Verified Endpoints
- **Frontend UI**: `http://localhost:80`
- **Backend API**: `http://localhost:5000`
- **API Health Check**: `http://localhost:5000/health`
- **Database Readiness Check**: `http://localhost:5000/ready`

---

## 🔌 API Catalog Summary

| Module | Key Endpoints | Description |
| :--- | :--- | :--- |
| **Auth** | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Authentication & session management |
| **Study Plans** | `POST /api/study-plans`, `GET /api/study-plans`, `PUT /api/study-plans/:id`, `DELETE /api/study-plans/:id` | Daily plan CRUD & task reordering |
| **Tasks** | `POST /api/study-plans/:planId/tasks`, `PUT /api/tasks/:id`, `DELETE /api/tasks/:id` | Task lifecycle & goal linking |
| **Streak** | `GET /api/streak`, `POST /api/streak/recalculate` | Deterministic streak calculation |
| **Focus** | `POST /api/focus-sessions/start`, `POST /api/focus-sessions/:id/pause`, `POST /api/focus-sessions/:id/complete` | Server-authoritative study timing |
| **Goals** | `POST /api/goals`, `GET /api/goals`, `PUT /api/goals/:id`, `DELETE /api/goals/:id` | Long-term target tracking |
| **Planner** | `GET /api/planner/grid`, `GET /api/planner/recommendations` | 7-day workload grid & recommendations |
| **Groups** | `POST /api/groups`, `POST /api/groups/join`, `POST /api/groups/:id/goals`, `GET /api/groups/:id/leaderboard` | Privacy-first accountability groups |
| **Reports** | `GET /api/reports`, `GET /api/reports/export?format=csv&dataset=tasks` | Analytics aggregation & JSON/CSV export |
| **Notifications** | `GET /api/notifications`, `PUT /api/notifications/read-all`, `GET/PUT /api/notifications/preferences` | User notification drawer & settings |
| **System** | `GET /health`, `GET /ready` | Operational status & DB ping |

---

## 📁 Repository Structure

```text
Study-Streak/
├── .github/workflows/ci.yml # Automated CI test and build pipeline
├── backend/
│   ├── prisma/              # Prisma schema definition & database migrations
│   ├── src/
│   │   ├── config/          # Environment configuration, DB client, logger
│   │   ├── middleware/      # Auth, rate limiting, request correlation ID, error handler
│   │   ├── modules/         # Auth, StudyPlan, Task, Streak, Focus, Goal, Group, Report, Analytics
│   │   ├── app.ts           # Express application declaration & middleware
│   │   └── server.ts        # Server entry point
│   ├── Dockerfile           # Multi-stage Node production container build
│   └── package.json
├── frontend/
│   ├── nginx.conf           # Nginx SPA fallback routing & API proxy config
│   ├── Dockerfile           # Multi-stage Nginx production build
│   ├── src/
│   │   ├── components/      # AppShell, NotificationCenter, UI primitives
│   │   ├── context/         # AuthContext, ThemeContext
│   │   ├── features/        # Auth, Dashboard, Planner, Focus, Groups, Goals, Calendar, Reports
│   │   ├── pwa/             # Service Worker, PWA install prompt, Offline banner
│   │   ├── services/        # Typed API Axios service layer
│   │   └── App.tsx          # React router setup
│   └── package.json
├── docker-compose.yml       # Production container orchestration
├── .env.example             # Safe environment variable template
└── package.json             # Root monorepo scripts
```

---

## 🌟 Technical Highlights & Engineering Decisions

1. **Explainable Scheduling Recommendation Algorithm**: Rather than relying on non-deterministic external LLMs or black-box APIs, the Study Planner uses a deterministic scoring algorithm evaluating daily time capacity, priority weightings, and preferred study days for instant, reproducible schedule recommendations.
2. **Deterministic Streak Engine**: Handles real-world study habits with strict logic — rest days preserve consecutive streaks, partial study days qualify as successes, and unrecorded past days retroactively calculate as missed without corrupting streak data.
3. **Zero-Social Privacy Accountability**: Designed specifically for focused study. Group members share progress metrics and goal milestones without exposing private tasks, notes, or personal study logs.
4. **Offline PWA Service Worker**: Custom service worker handles offline application loading while explicitly isolating authenticated `/api/*` network requests to guarantee multi-tenant security and zero cached session leakage.

---

## 👤 Author

**Chiranjeevi N** — Full-Stack Software Engineer  
GitHub: [@Chiranjeevi-N-29](https://github.com/Chiranjeevi-N-29)

---

> *StudyStreak — Build consistency, one day at a time.*
