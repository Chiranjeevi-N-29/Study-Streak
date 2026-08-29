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

### Streak Qualification
- A day qualifies as a **successful study day** if:
  1. A `StudyPlan` was created for that calendar date.
  2. The plan status is updated to `COMPLETED` (all planned tasks are marked as `COMPLETED`) **OR** `PARTIALLY_COMPLETED` (the sum of `estimatedDuration` of completed tasks is `>= minimumStudyTarget`).
- A day with **no study plan created** is treated as a rest day. It does *not* break the streak, but it does *not* increment the streak counter.
- A day with a study plan that remains `TODO`, `IN_PROGRESS`, or is explicitly marked `NOT_COMPLETED` at the end of the day **breaks the streak**.

### Calculation Logic
- The backend evaluates streaks using local date strings (`YYYY-MM-DD`) based on the user's timezone settings:
  1. Sort all unique successful study plan dates for the user chronologically: $S = [D_1, D_2, \dots, D_n]$.
  2. Compute **Current Streak**:
     - Let $D_{today}$ be the user's local date today, and $D_{yesterday}$ be the user's local date yesterday.
     - If $D_{today} \in S$: Find the length of the consecutive sequence of days counting backward from $D_{today}$.
     - If $D_{today} \notin S$ and $D_{yesterday} \in S$: Find the length of the consecutive sequence of days counting backward from $D_{yesterday}$ (preserving the streak since the user still has until the end of today to complete today's task).
     - Otherwise, the current streak is `0`.
  3. Compute **Longest Streak**:
     - Iterate through $S$ and find the maximum number of consecutive dates.
  4. Cache the resulting integer values in the `Streak` table to optimize read performance.

### Handling Historical Edits
- When a user retroactive marks a past task as complete:
  - The plan status for that past date is re-evaluated.
  - If its status upgrades to `COMPLETED` or `PARTIALLY_COMPLETED`, that date is added to the set of successful days $S$.
  - The server recalculates both the current and longest streaks across the full set $S$ and updates the cached values.

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
