# 🔥 StudyStreak

> **Plan your learning. Build your streak. Become consistent.**

StudyStreak is a production-hardened, full-stack study planning and accountability application designed to help students and developers **plan what they need to learn every day, track task completion, maintain study streaks, record daily reflections, unlock achievements, and understand their learning progress over time.**

The core philosophy is:

**PLAN → STUDY → COMPLETE → REFLECT → ANALYZE → IMPROVE**

---

## 🚀 Features

### 📅 Daily Study Planning & Tasks
- Create and organize study plans for any date.
- Granular task management: categories, priorities (`LOW`, `MEDIUM`, `HIGH`), estimated vs actual duration, task ordering, and status tracking (`TODO`, `IN_PROGRESS`, `COMPLETED`, `PARTIALLY_COMPLETED`, `NOT_COMPLETED`, `REST_DAY`).

### 🔥 Deterministic Streak Engine
- Automatic calculation of current streak, longest streak, and last active study date.
- Robust business rules: `COMPLETED` and `PARTIALLY_COMPLETED` plans qualify as successful study days. `REST_DAY` bridges consecutive study days without breaking streaks. Past unfulfilled days automatically fall back to `MISSED`.

### 📆 Study Calendar & Historical View
- Visual month-grid calendar mapping daily study status (Completed 🟢, Partial 🟡, Rest Day 🌴, Missed 🔴, Future 🔵).
- Allows users to inspect any past study day's plan and task breakdown.

### 📝 Daily Reflections & Learning Journal
- Capture end-of-day reflections answering: *What did I learn? What did I struggle with? What should I improve tomorrow?*

### 📈 Learning Analytics & Progress Intelligence
- Visual progress charts: weekly/monthly completion rates, total study duration, daily average study time, category breakdowns, and streak trends.

### 🏆 Achievements & Gamification
- Predefined achievement milestones across streaks, completed tasks, study hours, daily reflections, and consistent study days.
- Idempotent evaluation engine preventing duplicate unlocks.

### 🔔 Smart Notifications & Study Reminders
- Timezone-aware study and reflection reminders matching users' local times (`Asia/Kolkata`, `America/New_York`, `UTC`, etc.).
- Notifications center in application header with unread badge count, dropdown drawer, and opt-in browser notifications.

### 🛡️ Production Hardening & Security
- **Startup Validation**: Environment variables validated at startup using Zod (`DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `FRONTEND_URL`).
- **Security Headers**: `helmet` integration enforcing frameguard, X-Content-Type-Options, HSTS, and Referrer-Policy.
- **Rate Limiting**: Protection against brute-force login/registration attempts (10 req / 15 mins) and general API protection (200 req / 15 mins).
- **Session Security**: HTTP-only, SameSite=Strict JWT authentication cookies preventing XSS/CSRF token theft.
- **Strict Authorization**: Every resource endpoint explicitly verifies user ownership (IDOR defense).
- **Request Correlation IDs**: `X-Request-ID` correlation middleware attached to all requests for observability.
- **Standardized Error Handling**: Unified JSON error structures `{ success: false, error: { code, message } }` mapping status codes to clear error code constants (`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`), with internal stack trace sanitization in production.

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                       React SPA                             │
│       Vite + TypeScript + Vanilla CSS + Context APIs        │
└──────────────┬──────────────────────────────▲───────────────┘
               │                              │
               │ HTTPS + HTTP-Only Cookie     │ JSON Response
               ▼                              │
┌─────────────────────────────────────────────┴───────────────┐
│                    Express API Backend                      │
│                                                             │
│  [ Helmet ] ──► [ Rate Limiter ] ──► [ Request ID ]         │
│  [ Auth / JWT ] ──► [ Zod Validation ] ──► [ Controllers ]  │
│  [ Services: Plan | Streak | Analytics | Achievements ]   │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ Prisma ORM (Parameterized Queries)
               ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL 16 Database                   │
│  Users | StudyPlans | StudyTasks | Reflections | Streaks    │
│  Achievements | UserAchievements | Notifications | Prefs   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

- **Frontend**: React (TypeScript), Vite, Vanilla CSS, React Router DOM
- **Backend**: Node.js, Express (TypeScript), Prisma ORM, Zod, Helmet, Express Rate Limit
- **Database**: PostgreSQL 16
- **Testing**: Vitest, Supertest, Testing Library React
- **DevOps**: Docker, Docker Compose, GitHub Actions CI Workflow

---

## 📂 Project Structure

```text
Study-Streak/
├── .github/workflows/ci.yml # GitHub Actions CI workflow
├── backend/
│   ├── prisma/              # Schema definition & seed script
│   ├── src/
│   │   ├── config/          # Environment validator & logger
│   │   ├── middleware/      # Auth, rate limiter, request ID, error handler
│   │   ├── modules/         # Feature modules (Auth, Plan, Task, Streak, Analytics, Achievement, Notification)
│   │   ├── app.ts           # Express application setup
│   │   └── server.ts        # Server entry point
│   ├── Dockerfile           # Multi-stage Docker build
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # AppShell, NotificationCenter, UI primitives
│   │   ├── features/        # Planner, Calendar, Reflections, Analytics, Achievements, Settings
│   │   ├── services/        # Typed API service wrappers
│   │   └── App.tsx          # Application routing
│   └── package.json
├── docker-compose.yml       # Production Docker orchestration
├── .env.example             # Sample environment template
└── package.json             # Root monorepo scripts
```

---

## 🔌 API Endpoints Catalog

### Authentication
- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Login user & set HTTP-only cookie
- `POST /api/auth/logout` — Logout user & clear cookie
- `GET /api/auth/me` — Fetch authenticated user profile

### Study Plans & Tasks
- `POST /api/study-plans` — Create daily study plan
- `GET /api/study-plans` — Get user study plans
- `GET /api/study-plans/:id` — Get single study plan
- `PUT /api/study-plans/:id` — Update study plan
- `DELETE /api/study-plans/:id` — Delete study plan
- `POST /api/study-plans/:planId/tasks` — Create task
- `PUT /api/tasks/:id` — Update task
- `DELETE /api/tasks/:id` — Delete task
- `PUT /api/study-plans/:planId/tasks/reorder` — Reorder tasks

### Streak & Analytics
- `GET /api/streak` — Fetch current streak statistics
- `POST /api/streak/recalculate` — Trigger recalculation
- `GET /api/analytics/summary` — Overview analytics metrics
- `GET /api/analytics/completion` — Completion trend analytics
- `GET /api/analytics/categories` — Category breakdown analytics

### Achievements & Notifications
- `GET /api/achievements` — Get user achievements & progress
- `GET /api/achievements/unlocked` — Get unlocked achievements
- `GET /api/notifications` — Get user notifications
- `GET /api/notifications/unread-count` — Get unread count
- `PUT /api/notifications/:id/read` — Mark notification read
- `PUT /api/notifications/read-all` — Mark all notifications read
- `GET /api/notifications/preferences` — Get notification settings
- `PUT /api/notifications/preferences` — Update notification settings

### Health & Readiness
- `GET /health` — Simple health status check (`{ status: "ok" }`)
- `GET /ready` — Database connection readiness check (`{ status: "ok", database: "connected" }`)

---

## 🚀 Getting Started & Setup

### Prerequisites
- Node.js (v20+ recommended)
- PostgreSQL 16 (or Docker)

### Installation
```bash
# Clone the repository
git clone https://github.com/Chiranjeevi-N-29/Study-Streak.git
cd Study-Streak

# Install all dependencies across workspaces
npm install
```

### Environment Configuration
Copy `.env.example` to `.env` in repository root:
```bash
cp .env.example .env
```

Customize environment keys:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/studystreak?schema=public
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
FRONTEND_URL=http://localhost:5173
```

### Running Local Database & Migrations
```bash
# Run Prisma migrations
npx prisma migrate dev --schema=backend/prisma/schema.prisma

# Seed static achievements
npm run db:seed -w backend
```

### Running Development Servers
```bash
# Start both backend and frontend concurrently
npm run dev
```

---

## 🧪 Quality Assurance & Testing

Run the complete automated quality pipeline:
```bash
# Full quality check (Lint + Typecheck + Tests + Build)
npm run check
```

Or individual checks:
```bash
# Run unit & integration tests (117 tests passing)
npm test

# Run TypeScript compilation checks
npm run typecheck

# Run ESLint checks
npm run lint

# Run production build
npm run build
```

---

## 🐳 Docker Production Deployment

To run the complete production stack (PostgreSQL + Express API Backend) using Docker Compose:

```bash
docker-compose up -d --build
```

Verify service readiness:
```bash
curl http://localhost:5000/ready
```

---

## 🚀 Production Deployment & Launch

For detailed step-by-step production deployment instructions, environment variables, hosting options, and database migration commands, refer to the [Production Deployment Specification](file:///d:/projects/Study-Streak/docs/deployment.md).

### Quick Deployment Checklist
1. **Environment Configuration**: Copy `.env.example` to your hosting provider settings (`DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL`, `VITE_API_URL`).
2. **Safe Migration Execution**: Run non-destructive production migrations:
   ```bash
   npx prisma migrate deploy --schema=backend/prisma/schema.prisma
   ```
3. **Idempotent Data Seeding**: Seed static achievement definitions:
   ```bash
   npm run db:seed -w backend
   ```
4. **Health & Readiness Verification**:
   ```bash
   curl https://api.studystreak.app/health
   curl https://api.studystreak.app/ready
   ```

---

## 👨‍💻 Author
**Chiranjeevi N** — Full-Stack Software Engineer

