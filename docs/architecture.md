# StudyStreak Architecture Specification

This document details the architectural guidelines, system components, data schemas, API routes, security implementations, and testing strategies for **StudyStreak**.

---

## 1. System Components & Flow

```text
       Frontend (React + Vite SPA)
                  │  (HTTPS + JWT in Secure HttpOnly Cookie)
                  ▼
          Express Routing (API Routes)
                  │
                  ▼
         Middlewares (Auth check, Zod payload validation)
                  │
                  ▼
             Controllers (HTTP Request parsing / Response mapping)
                  │
                  ▼
         Services (Core Business Logic - e.g., Streak Engine)
                  │
                  ▼
         Prisma Client (Data Access / Repository)
                  │
                  ▼
            PostgreSQL Database
```

- **Frontend**: Single Page Application built with React, TypeScript, and Vite. Handles user interactions, visual analytics, calendar views, and local caching of active states. Communication with the backend is done via standard fetch/axios clients using cross-origin resource sharing (CORS) credentials (cookies).
- **Routing & Validation**: Requests are parsed by Express routers. Validations are executed instantly using **Zod** middleware before hitting any business logic handlers.
- **Controllers**: Responsible for parsing incoming data (params, queries, bodies), translating exceptions into correct HTTP status codes, and structuring JSON responses. They do *not* execute SQL queries or run complex algorithms directly.
- **Services (Business Logic)**: Houses pure domain logic (such as the Streak calculation calculations, badge awarding criteria, and scheduling shift algorithms). Fully decoupled from HTTP requests.
- **Database (Prisma & PostgreSQL)**: Relational PostgreSQL db controlled via Prisma ORM schemas. Migration history is versioned in source control.

---

## 2. Recommended Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React (TS) + Vite | Industry standard, robust ecosystem, super fast HMR and build times. |
| **Styling** | Vanilla CSS Modules | Clean separation, zero style pollution, native performance, simple theme variables. |
| **Backend** | Express + TypeScript | Lightweight, developer-friendly, easy to structure in a clean modular pattern. |
| **Database** | PostgreSQL | Transactional integrity (ACID), strong relational safety for streak tracking. |
| **ORM** | Prisma ORM | Auto-generated TS types, easy migration system, high readability. |
| **Validation** | Zod | Single source of truth for runtime validation and TypeScript compile-time types. |
| **Authentication** | JWT (HttpOnly Cookies) | Protects against XSS (via HttpOnly) and CSRF (via SameSite=Strict cookies). |
| **Testing** | Vitest + Supertest | Fast execution, native TypeScript config support, clean API mocking. |

---

## 3. Database Schema (Prisma Specification)

Below is the design of our core database tables, mapping the relations and indexes required for performance:

```prisma
// This is the proposed Prisma Schema representation for StudyStreak

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

enum Status {
  TODO
  IN_PROGRESS
  COMPLETED
  PARTIALLY_COMPLETED
  NOT_COMPLETED
  REST_DAY
  MISSED
}

enum ConditionType {
  STREAK
  TASKS_COMPLETED
  TOTAL_HOURS
}

model User {
  id                    String                 @id @default(uuid())
  email                 String                 @unique
  passwordHash          String
  name                  String
  timezone              String                 @default("UTC")
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt
  studyPlans            StudyPlan[]
  reflections           DailyReflection[]
  achievements          UserAchievement[]
  streak                Streak?
  notificationPreference NotificationPreference?

  @@index([email])
}

model StudyPlan {
  id                 String           @id @default(uuid())
  userId             String
  user               User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  date               String           // Stored as local date string YYYY-MM-DD
  title              String?
  description        String?
  minimumStudyTarget Int              @default(30) // in minutes
  status             Status           @default(TODO)
  tasks              StudyTask[]
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  @@unique([userId, date])
  @@index([userId, date])
}

model StudyTask {
  id                String           @id @default(uuid())
  studyPlanId       String
  studyPlan         StudyPlan        @relation(fields: [studyPlanId], references: [id], onDelete: Cascade)
  title             String
  description       String?
  category          String
  priority          Priority         @default(MEDIUM)
  estimatedDuration Int              // in minutes
  actualDuration    Int              @default(0) // in minutes
  order             Int              @default(0)
  status            Status           @default(TODO)
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  @@index([studyPlanId])
}

model DailyReflection {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date      String   // Stored as local date string YYYY-MM-DD
  learned   String
  struggled String
  nextSteps String
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, date])
  @@index([userId, date])
}

model Streak {
  id             String    @id @default(uuid())
  userId         String    @unique
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  currentStreak  Int       @default(0)
  longestStreak  Int       @default(0)
  lastActiveDate String?   // Local date string YYYY-MM-DD of last streak-qualifying day
  updatedAt      DateTime  @updatedAt
}

model Achievement {
  id             String            @id @default(uuid())
  code           String            @unique
  title          String
  description    String
  icon           String
  conditionType  ConditionType
  conditionValue Int
  users          UserAchievement[]
}

model UserAchievement {
  id            String      @id @default(uuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievementId String
  achievement   Achievement @relation(fields: [achievementId], references: [id], onDelete: Cascade)
  unlockedAt    DateTime    @default(now())

  @@unique([userId, achievementId])
}

model NotificationPreference {
  id                    String   @id @default(uuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  dailyReminderEnabled  Boolean  @default(true)
  dailyReminderTime     String   @default("09:00") // Local HH:MM
  eveningReminderEnabled Boolean  @default(true)
  eveningReminderTime   String   @default("21:00") // Local HH:MM
  streakAtRiskEnabled   Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

---

## 4. Streak Calculation Engine (Business Rules)

The streak engine is a core value proposition. We define its rules explicitly to support **explicit REST days** and **explicit MISSED days**, and how they affect the calculations.

### Definitions & Day Categorization
For every calendar date $D$ from the user's start tracking date ($D_{start}$, i.e., user registration date in their local timezone) to the user's current local date ($D_{today}$), we retrieve the user's `StudyPlan` for that date:

- **COMPLETED**: A `StudyPlan` is `COMPLETED` when all planned `StudyTasks` are completed.
- **PARTIALLY_COMPLETED**: A `StudyPlan` is `PARTIALLY_COMPLETED` when:
  * At least one task is completed
  * The total actual/qualifying study time is greater than or equal to `minimumStudyTarget`
- **SUCCESSFUL DAY**: A day qualifies as a successful study day (categorized as **`SUCCESS`**) when the `StudyPlan` status is either:
  * `COMPLETED`
  * `PARTIALLY_COMPLETED`
- **REST_DAY**: An explicitly marked `REST_DAY` (categorized as **`REST`**):
  * Does not increase the streak
  * Does not break the streak
  * Can bridge successful study days
- **MISSED**: A `MISSED` day (categorized as **`MISSED`**):
  * Breaks the current streak
  * Does not count toward successful study days
  * *Note*: If no `StudyPlan` exists for a past date ($D < D_{today}$), or if a past `StudyPlan` remains as `TODO` or `IN_PROGRESS` after the local day ends, it is categorized as `MISSED`.
- **PENDING**: If a plan for today ($D == D_{today}$) exists with status `TODO` or `IN_PROGRESS` (or if no plan exists yet for today), it is categorized as **`PENDING`** since the user still has time to complete tasks or explicitly mark it as a rest day.

### Streak Calculation Algorithm
Given the ordered list of daily categories from $D_{start}$ to $D_{today}$ (inclusive):
1. Initialize:
   - `tempStreak = 0` (current consecutive successful streak)
   - `longestStreak = 0` (maximum consecutive successful streak over history)
2. For each date $D$ from $D_{start}$ to $D_{today}$:
   - If category is **`SUCCESS`**:
     - `tempStreak += 1`
     - `longestStreak = max(longestStreak, tempStreak)`
   - If category is **`REST`**:
     - *Bridge behavior*: Do not increment `tempStreak` (it does not add to the active streak count), but **do not reset it to 0** either. The active streak count is preserved across the rest day.
   - If category is **`MISSED`**:
     - `tempStreak = 0` (streak is broken)
   - If category is **`PENDING`** (only possible for today):
     - Do not modify `tempStreak`. (The streak is not broken yet, nor is it incremented).
3. The final `currentStreak` is the value of `tempStreak` after processing $D_{today}$.
4. The final `longestStreak` is the value of `longestStreak` at the end of the loop.

### Scenario Examples:
- **One Rest Day**:
  - `[SUCCESS, REST, SUCCESS]` -> `tempStreak` goes `1 -> 1 -> 2`. Current Streak = `2`. The rest day successfully bridges the two active days without breaking or resetting the streak.
- **Multiple Consecutive Rest Days**:
  - `[SUCCESS, REST, REST, REST, SUCCESS]` -> `tempStreak` goes `1 -> 1 -> 1 -> 1 -> 2`. Current Streak = `2`. Consecutive rest days successfully bridge the gap.
- **Rest Day at Start of Tracking**:
  - `[REST, SUCCESS, SUCCESS]` -> `tempStreak` goes `0 -> 1 -> 2`. Current Streak = `2`.
- **Rest Day after a Missed Day**:
  - `[SUCCESS, MISSED, REST, SUCCESS]` -> `tempStreak` goes `1 -> 0 -> 0 -> 1`. Current Streak = `1`. The rest day does not retroactively heal a broken streak; it only bridges contiguous active periods.
- **Changing a Rest Day to a Study Day**:
  - Changing a `REST_DAY` plan to a study plan resets its category to `PENDING` (if today) or `MISSED`/`SUCCESS` (if completed). Once tasks are added and completed, it becomes `SUCCESS`, upgrading the streak count (e.g., `[SUCCESS, REST, SUCCESS]` streak of `2` becomes `[SUCCESS, SUCCESS, SUCCESS]` streak of `3`).
- **Changing a Completed/Missed Day to a Rest Day**:
  - Changing a past `SUCCESS` day to `REST_DAY` decrements the streak count but preserves continuity (bridging). E.g., `[SUCCESS, SUCCESS, SUCCESS]` (streak `3`) becomes `[SUCCESS, REST, SUCCESS]` (streak `2`).
  - Changing a past `MISSED` day to `REST_DAY` (by creating/updating a plan for that date with status `REST_DAY`) removes the break, connecting any completed days before and after it. E.g., `[SUCCESS, MISSED, SUCCESS]` (streak reset to `1` on day 3) becomes `[SUCCESS, REST, SUCCESS]` (streak of `2` spans across).

### Timezone/Date Boundaries
- Timezones are detected on the frontend and sent via headers or stored in the user profile. The dates are parsed into `YYYY-MM-DD` strings locally before sending to the backend, ensuring calculations align perfectly with the user's local day boundaries.

### Handling Historical Edits
- When a user retroactively edits a task or plan from a previous day:
  - The plan status for that past date is re-evaluated.
  - The server recalculates both the current and longest streaks across the full chronological list of daily categories and updates the cached values in the database.

---

## 5. REST API Architecture

| Module | Method | Path | Request Body | Response | Description | Auth |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | `{ email, password, name, timezone }` | `{ user }` | Create user profile, sets HttpOnly Cookie | None |
| | `POST` | `/api/auth/login` | `{ email, password }` | `{ user }` | Authenticates credentials, sets cookie | None |
| | `POST` | `/api/auth/logout` | None | `{ success: true }` | Clears JWT Cookie | JWT |
| | `GET` | `/api/auth/me` | None | `{ user }` | Returns active user session profile | JWT |
| **Plans** | `GET` | `/api/study-plans` | None (Query: `startDate`, `endDate`) | `[StudyPlan & { tasks }]` | Fetches plans within calendar range | JWT |
| | `POST` | `/api/study-plans` | `{ date, title, minimumStudyTarget }` | `{ StudyPlan }` | Creates study plan for local date | JWT |
| | `GET` | `/api/study-plans/today` | None | `{ StudyPlan & { tasks } }` | Fetches today's plan | JWT |
| | `GET` | `/api/study-plans/:id` | None | `{ StudyPlan & { tasks } }` | Detailed study plan fetch | JWT |
| **Tasks** | `POST` | `/api/study-plans/:planId/tasks` | `{ title, description, category, priority, estimatedDuration }` | `{ StudyTask }` | Add study task to specific plan | JWT |
| | `PUT` | `/api/tasks/:id` | `{ title, description, status, actualDuration, ... }` | `{ StudyTask }` | Updates task title, status, or time spent | JWT |
| | `DELETE` | `/api/tasks/:id` | None | `{ success: true }` | Deletes a task from plan | JWT |
| | `PUT` | `/api/study-plans/:planId/tasks/reorder` | `{ orderedTaskIds }` | `{ success: true }` | Reorder task lists | JWT |
| **Streak** | `GET` | `/api/streak` | None | `{ currentStreak, longestStreak, totalSuccessDays }` | Fetches user streak details | JWT |
| **Reflections** | `GET` | `/api/reflections/:date` | None | `{ DailyReflection }` | Fetches reflection notes for a date | JWT |
| | `POST` | `/api/reflections` | `{ date, learned, struggled, nextSteps, notes }` | `{ DailyReflection }` | Saves/Updates reflection for date | JWT |
| **Stats** | `GET` | `/api/analytics/summary` | None | `{ totalHours, tasksCompleted, successRate }` | Fetches summary aggregates | JWT |
| | `GET` | `/api/analytics/charts` | None | `{ weeklyHistory: [], categoryTime: [] }` | Fetches visual chart data arrays | JWT |
| **Achievements** | `GET` | `/api/achievements` | None | `[Achievement & { unlocked }]` | Lists badges and user status | JWT |

---

## 6. Security Architecture

1. **Defense-in-Depth for Authentication**:
   - **Email/Password MVP**: For the MVP, authentication relies strictly on custom email/password registration, login, logout, and protected routes. Third-party authentication (e.g. Google OAuth) is deferred as a future enhancement.
   - Authentication tokens are generated as compact JSON Web Tokens (JWT) signed with a robust HMAC-SHA256 secret.
   - The token is *never* stored in `localStorage` or `sessionStorage` (preventing retrieval through cross-site scripting vulnerabilities).
   - Stored in an **HttpOnly, Secure, SameSite=Strict** cookie.
2. **Access Control (Row-Level Security)**:
   - The database client code never fetches data without referencing `userId = authenticatedUserId` in the `where` constraints. E.g.:
     ```typescript
     const plan = await prisma.studyPlan.findFirst({
       where: { id: planId, userId: req.user.id }
     });
     ```
3. **Robust Input Filtering**:
   - Every input payload must be parsed and vetted using **Zod** middleware schemas. Excess fields are stripped, and format specifications (e.g. checking if a date fits the `YYYY-MM-DD` regex) are validated.
4. **Environment Controls**:
   - Core keys, ports, and connection strings are fetched through `process.env`.
   - Production secrets are managed through environment injects. A clean `.env.example` is maintained in the root directory.

---

## 7. Testing Architecture

Our testing configuration is designed to provide rapid developer feedback and prevent regressions:

1. **Unit Testing (Vitest)**:
   - Tests pure modules (e.g., date translations, string parsing, and specifically `StreakService` streak calculators).
   - Mocks the database client using `vitest-mock-extended` or custom repositories, enabling database-independent execution.
2. **Integration API Tests (Supertest + Vitest)**:
   - Spawns a lightweight Express instance using an isolated test SQL schema.
   - Tests HTTP route handlers, cookie extraction, validation errors, and DB changes.
3. **Component Tests (Vitest + React Testing Library)**:
   - Tests React component rendering, form submissions, states, and client validation filters.
4. **Edge Cases Covered**:
   - Timezone variations (verifying streak logic works across positive/negative GMT boundaries).
   - Streak evaluation when a user has a combination of completed days, failed days, and rest days.
   - Retroactive task ticking.
