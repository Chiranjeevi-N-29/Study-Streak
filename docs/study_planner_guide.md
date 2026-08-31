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
