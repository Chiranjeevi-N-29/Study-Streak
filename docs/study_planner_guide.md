# Study Planner User Guide

This guide explains the data models, API endpoints, database relationships, and local usage for the Study Planner feature implemented in Milestone 3.

## Features & Usage

The Study Planner is the core dashboard page where authenticated users manage their daily learning:

1. **Daily Study Plan**:
   - **View Today's Plan**: Automatically detects your timezone and retrieves today's local study plan.
   - **Create / Edit Plan**: If no plan exists, click **Create Today's Plan** to set a title, optional description, and a minimum study target (in minutes).
   - **Update Plan Settings**: Click the edit pencil icon on the card to change target time, title, or description.
   - **Status Dropdown**: Transition the plan status (`TODO`, `IN_PROGRESS`, `COMPLETED`, `PARTIALLY_COMPLETED`, `NOT_COMPLETED`, `REST_DAY`, `MISSED`) to track daily milestones.
   - **Delete Plan**: Removes today's plan and cascades deletions to all associated tasks.

2. **Daily Tasks**:
   - **Add Task**: Click **+ Add Task** to input title, description, category (e.g. React, DSA), priority (Low, Medium, High), and estimated duration.
   - **Toggle Completion**: Click the checkbox on any task card to instantly toggle status to `COMPLETED` or `TODO`.
   - **Edit Task**: Click the pencil icon on a task to adjust title, actual duration, priority, category, or status.
   - **Reorder Tasks**: Click the ▲ and ▼ buttons on any task card to change task sequence. The backend executes a database transaction to save the exact ordering indexes.
   - **Delete Task**: Removes the task from the current plan.

---

## Streak Engine (Milestone 4)

Consistency is tracked via a timezone-aware Streak Engine. The system computes user consistency daily starting from the user's registration date (`D_start`) to today (`D_today`).

### Streak Business Rules

Each day's study activity is dynamically categorized as one of four states:

1. **`SUCCESS`**:
   - The user completes all planned `StudyTasks` on that date (`COMPLETED`).
   - OR total actual duration (`actualDuration`) of completed tasks is greater than or equal to the plan's `minimumStudyTarget` (`PARTIALLY_COMPLETED`).
   - *Result*: Increments the streak by 1 day and updates `longestStreak` if exceeded.
2. **`REST_DAY`**:
   - The study plan for the date is explicitly marked as `REST_DAY`.
   - *Result*: Does **NOT** break the streak, does **NOT** increment the streak count. It acts as a bridge day preserving the active streak (e.g., `SUCCESS` → `REST` → `SUCCESS` results in a streak of 2).
3. **`MISSED`**:
   - A past day had no study plan.
   - OR a past day had a plan but did not meet the `SUCCESS` or `REST` criteria.
   - *Result*: Resets the current streak to `0`.
4. **`PENDING`**:
   - Applies only to today (or future days). Today has no plan yet, or has a plan with status `TODO`/`IN_PROGRESS` that has not yet qualified as `SUCCESS`.
   - *Result*: Does **NOT** break the current streak and does **NOT** increment it. The active streak from yesterday is preserved.

### Timezone & Local Calendar Dates
- All calculations are anchored to the user's local timezone (e.g. `Asia/Kolkata` or `America/New_York`).
- `D_start` is the registration date formatted in the user's timezone.
- `D_today` is today's local date formatted in the user's timezone.
- This prevents UTC offset mismatches from falsely breaking or resetting streaks.

### Cache & Automatic Recalculation
- Streak metrics (`currentStreak`, `longestStreak`, `lastActiveDate`) are cached in the `Streak` database table (one unique row per user).
- **Auto-Recalculation**: Recalculation is triggered automatically on the backend service layer whenever plans or tasks are created, updated, deleted, or reordered.
- **Historical Edits**: Modifying historical plans/tasks triggers a full, chronological recalculation from the original source data, ensuring the cache is always self-healing and accurate.

---

## Streak API (`/api/streak`)

| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/streak` | Fetch the current user's streak details and successful days count | JWT |

#### Example JSON Response
```json
{
  "success": true,
  "currentStreak": 3,
  "longestStreak": 5,
  "successfulStudyDays": 12,
  "lastActiveDate": "2026-08-30"
}
```

---

## Database Relationships

The database model mappings are defined in the schema:

```text
  ┌──────────────┐             ┌─────────────────┐             ┌─────────────────┐
  │     User     │ 1        0..*│    StudyPlan    │ 1        0..*│    StudyTask    │
  │              ├─────────────►│                 ├─────────────►│                 │
  │  id (PK)     │             │  id (PK)        │             │  id (PK)        │
  │  email       │             │  userId (FK)    │             │  studyPlanId(FK)│
  │  timezone    │             │  date           │             │  order          │
  └──────────────┘             └─────────────────┘             └─────────────────┘
```

- **User to StudyPlan**: One-to-many relationship. A user can create at most one StudyPlan per date. Cascades delete when the User account is deleted.
- **StudyPlan to StudyTask**: One-to-many relationship. A StudyPlan contains multiple tasks. Cascades delete when the StudyPlan is deleted.
- **Indexes & Unique Constraints**:
  - Unique constraint on `StudyPlan(userId, date)` prevents duplicate plans.
  - Index on `StudyPlan(userId, date)` optimizes query times.
  - Index on `StudyTask(studyPlanId)` speeds up task loading.

---

## API Endpoints Reference

### Study Plans API (`/api/study-plans`)

| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/study-plans` | Create a study plan for a specific local date | JWT |
| `GET` | `/api/study-plans/today` | Fetch today's local study plan including tasks | JWT |
| `GET` | `/api/study-plans` | Fetch plans within a range (query params: `startDate`, `endDate`) | JWT |
| `GET` | `/api/study-plans/:id` | Fetch details of a single plan | JWT |
| `PUT` | `/api/study-plans/:id` | Update title, description, target, or status | JWT |
| `DELETE` | `/api/study-plans/:id` | Delete plan and all associated tasks | JWT |

### Tasks API (`/api/tasks`)

| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/study-plans/:planId/tasks` | Create a task under a plan | JWT |
| `PUT` | `/api/tasks/:id` | Update task details (status, category, duration, priority) | JWT |
| `DELETE` | `/api/tasks/:id` | Delete task | JWT |
| `PUT` | `/api/study-plans/:planId/tasks/reorder` | Reorder task IDs sequence (JSON body: `orderedTaskIds`) | JWT |

---

## Local Development & Setup

1. **Install workspace dependencies**:
   ```bash
   npm install
   ```
2. **Apply migrations offline / online**:
   Generate the schema migrations for PostgreSQL:
   ```bash
   npx prisma migrate dev --name init_milestone_3 --create-only
   ```
3. **Start backend and frontend simultaneously**:
   ```bash
   npm run dev
   ```
4. **Execute all test suites**:
   ```bash
   npm run test
   ```
