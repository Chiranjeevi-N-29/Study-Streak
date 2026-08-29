# Study-Streak
Here’s a **portfolio-quality `README.md`** for your StudyStreak project. You can paste this directly into your repository.

# 🔥 StudyStreak

> **Plan your learning. Build your streak. Become consistent.**

StudyStreak is a full-stack study planning and accountability application designed to help students and developers **plan what they need to learn every day, track completion, maintain study streaks, and understand their learning progress over time.**

The core philosophy is:

**PLAN → STUDY → COMPLETE → REFLECT → ANALYZE → IMPROVE**

---

## 🎯 Problem

Learning consistently is difficult.

Most task-management applications can tell you **what tasks you have**, but they don't strongly focus on:

* Daily learning consistency
* Study streaks
* Learning progress
* Accountability
* Reflection
* Long-term skill development

StudyStreak combines these into a single platform.

---

## 🚀 Features

### 📅 Daily Study Planning

Create a study plan for every day.

Each study task can contain:

* Task title
* Description
* Category
* Priority
* Estimated duration
* Order
* Status

Task statuses:

* `TODO`
* `IN_PROGRESS`
* `COMPLETED`
* `PARTIALLY_COMPLETED`
* `NOT_COMPLETED`

---

### 🔥 Study Streak

Track consistency through a daily streak system.

The application tracks:

* Current streak
* Longest streak
* Successful study days
* Missed days
* Completion percentage

**Core Streak Rules**:
* **COMPLETED**: A StudyPlan is COMPLETED when all planned StudyTasks are completed.
* **PARTIALLY_COMPLETED**: A StudyPlan is PARTIALLY_COMPLETED when at least one task is completed and the total actual/qualifying study time is greater than or equal to `minimumStudyTarget`.
* **SUCCESSFUL DAY**: A day qualifies as a successful study day when the StudyPlan status is either COMPLETED or PARTIALLY_COMPLETED.
* **REST_DAY**: An explicitly marked REST_DAY does not increase the streak, does not break the streak, and can bridge successful study days.
* **MISSED**: A MISSED day breaks the current streak and does not count toward successful study days (automatic fallback for past days with no plan or left incomplete).

---

### 📊 Dashboard

The dashboard provides an overview of the user's learning activity.

It includes:

* Today's study plan
* Today's tasks
* Current streak
* Longest streak
* Completion percentage
* Study time
* Recent activity

---

### 📆 Study Calendar

Visualize study activity across days.

Each date can indicate:

* 🟢 Completed (All tasks completed)
* 🟡 Partially completed (Time target met)
* 🌴 Rest Day (Explicitly scheduled rest day)
* 🔴 Missed (Past days with no plan or marked incomplete/missed)
* ⚪ No plan yet (For the current day only, not yet missed)
* 🔵 Future

Users can select a date to view its study plan and history.

---

### 📝 Daily Reflection

At the end of a study day, users can record:

**What did I learn?**

**What did I struggle with?**

**What should I continue tomorrow?**

This creates a personal learning journal over time.

---

### 📈 Learning Analytics

Track long-term learning progress through:

* Weekly completion rate
* Monthly completion rate
* Total study hours
* Average daily study time
* Completed tasks
* Missed tasks
* Category-wise progress
* Study trends
* Current streak
* Longest streak

---

### 🏆 Achievements

Users can unlock achievements based on their progress.

Examples:

* 🌱 First Study Day
* 🔥 7 Day Streak
* 🔥 30 Day Streak
* 💪 50 Day Streak
* 🏆 100 Day Streak
* 📚 100 Tasks Completed
* 📚 500 Tasks Completed
* ⏱️ 100 Study Hours

---

### 🔔 Study Reminders

Users can configure reminders for:

* Daily study
* Evening completion
* Streak at risk

Notifications respect the user's timezone.

---

### 🤖 AI Study Planner

The planned AI module can generate personalized learning plans based on:

* Learning goal
* Target role
* Current skill level
* Available study time
* Preferred study days
* Target deadline

The AI can generate:

* Learning roadmap
* Topics
* Daily tasks
* Estimated duration
* Prerequisites
* Milestones

Generated plans require user confirmation before being added to the actual study schedule.

---

### 🧠 Adaptive Study Planning

If a user doesn't complete planned tasks, StudyStreak can recommend how to redistribute unfinished work.

The system considers:

* Available time
* Task difficulty
* Priority
* Deadlines
* Previous completion patterns

The goal is to **adapt the plan without overwhelming the user.**

---

# 🏗️ Architecture

StudyStreak follows a modular full-stack architecture.

```text
                    ┌─────────────────────┐
                    │      Frontend       │
                    │                     │
                    │  Web Application    │
                    └──────────┬──────────┘
                               │
                               │ REST API
                               ▼
                    ┌─────────────────────┐
                    │       Backend       │
                    │                     │
                    │ Authentication      │
                    │ Study Plans         │
                    │ Tasks               │
                    │ Streak Engine       │
                    │ Analytics           │
                    │ AI Services         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Database       │
                    │                     │
                    │ Users               │
                    │ Study Plans         │
                    │ Tasks               │
                    │ Reflections         │
                    │ Achievements        │
                    │ Statistics          │
                    └─────────────────────┘
```

# 🛠️ Tech Stack

We utilize TypeScript end-to-end to ensure type safety and high development velocity:

* **Frontend**: React (TypeScript), Vite, Vanilla CSS Modules
* **Backend**: Node.js, Express (TypeScript), Zod for validation
* **Database**: PostgreSQL with Prisma ORM
* **Testing**: Vitest for unit & integration testing, Supertest for API routes
* **Development**: ESLint, Prettier, Husky

For a deep dive into the engineering rationale, refer to the [Architecture Specification](file:///d:/projects/Study-Streak/docs/architecture.md).

---

# 📂 Project Structure

```text
study-streak/
├── frontend/                 # React client SPA (Vite)
│   ├── src/
│   │   ├── components/       # Shared UI components
│   │   ├── features/         # Feature modules (auth, dashboard, analytics)
│   │   ├── hooks/            # Global custom React hooks
│   │   ├── services/         # API request wrapper and clients
│   │   ├── types/            # TypeScript typing declarations
│   │   └── App.tsx           # Router and app shell
│   └── package.json          # Frontend packages
│
├── backend/                  # Express server
│   ├── src/
│   │   ├── config/           # Database configurations and env
│   │   ├── middleware/       # JWT auth, Zod validation, error handles
│   │   ├── modules/          # Feature domains (controllers, services, routing)
│   │   └── server.ts         # Listener entry point
│   ├── prisma/               # Database layout and migrations
│   └── package.json          # Backend packages
│
├── docs/                     # Architectural and API documentation
│   └── architecture.md       # Tech stack and patterns spec
│
├── .env.example              # Sample environment configuration
├── .gitignore                # Global git ignore configurations
└── package.json              # Monorepo / Root packages setup
```

---

# 🗄️ Core Data Model

Refer to the [Prisma Schema Spec in Architecture Specification](file:///d:/projects/Study-Streak/docs/architecture.md#L45-L175) for the exact fields, relationships, and constraints. The core entities are:

- **User**: Represents a student's profile, credentials, timezone, and preferences.
- **StudyPlan**: Daily schedules, linked uniquely to a user and local date.
- **StudyTask**: Granular learning tasks (category, status, duration, priority) under a plan.
- **DailyReflection**: Journals capturing learning outcomes, struggles, and next actions.
- **Streak**: Tracks current/longest streak and last active date.
- **Achievement / UserAchievement**: Gamification badges unlocked by study performance.
- **NotificationPreference**: Time and channel settings for study reminders.


---

# 🔐 Security

Security is considered from the beginning.

The application will follow practices such as:

* Password hashing
* Authentication
* Authorization
* Input validation
* Secure API design
* Environment variables
* No committed secrets
* User data isolation
* Proper error handling

Users must only be able to access their own study data.

---

# 🧪 Testing Strategy

StudyStreak will use multiple levels of testing.

### Unit Tests

Important business logic such as:

* Streak calculations
* Completion calculations
* Achievement conditions
* Analytics calculations
* Date handling

### Integration Tests

Test interactions between:

```text
API → Service → Database
```

### Frontend Tests

Test:

* Components
* User interactions
* Forms
* Task completion
* Dashboard states

---

# 🌱 Development Roadmap

## Phase 1 — Foundation

* [ ] Project setup
* [ ] Architecture
* [ ] Database
* [ ] Authentication
* [ ] Development tooling

## Phase 2 — Core Study System

* [ ] Daily study plans
* [ ] Study tasks
* [ ] Task completion
* [ ] Streak engine
* [ ] Dashboard
* [ ] Study calendar
* [ ] Daily reflections

## Phase 3 — Analytics & Gamification

* [ ] Analytics
* [ ] Progress charts
* [ ] Achievements
* [ ] Study statistics
* [ ] Weekly reports

## Phase 4 — Productivity

* [ ] Study reminders
* [ ] Streak protection
* [ ] Productivity insights
* [ ] Time tracking

## Phase 5 — AI

* [ ] AI study planner
* [ ] AI-generated roadmap
* [ ] Adaptive study planning
* [ ] Personalized recommendations

## Phase 6 — Production

* [ ] Security audit
* [ ] Performance optimization
* [ ] Automated testing
* [ ] CI/CD
* [ ] Production deployment
* [ ] Monitoring
* [ ] Documentation

---

# 🔄 Development Workflow

StudyStreak is developed incrementally.

Each feature follows:

```text
Plan
 ↓
Design
 ↓
Implement
 ↓
Test
 ↓
Review
 ↓
Commit
 ↓
Push
```

Git commits should represent meaningful changes.

Example:

```text
feat: add authentication
feat: add daily study plans
feat: implement study tasks
feat: implement streak engine
feat: add study calendar
feat: add analytics

fix: prevent duplicate daily plans
fix: correct streak calculation

test: add streak edge case tests

refactor: simplify study plan service
```

---

# 🚀 Getting Started

## Prerequisites

Install:

* Node.js
* npm
* Git
* Database required by the project

Check versions:

```bash
node --version
npm --version
git --version
```

---

## Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/study-streak.git
cd study-streak
```

---

## Install Dependencies

```bash
npm install
```

If frontend and backend use separate packages:

```bash
cd frontend
npm install

cd ../backend
npm install
```

---

## Environment Variables

Create environment files based on:

```text
.env.example
```

Never commit actual secrets.

Example:

```env
DATABASE_URL=
JWT_SECRET=
API_URL=
AI_API_KEY=
```

---

## Run the Application

Development commands will be documented here once the project architecture is finalized.

Example:

```bash
npm run dev
```

---

# 📌 Current Status

**🚧 Under Active Development**

StudyStreak is being developed incrementally, with each major feature tested and committed separately.

---

# 🎯 Project Goal

The ultimate goal of StudyStreak is to create a system that helps a learner answer three questions every day:

> **What should I learn today?**

> **Did I actually do it?**

> **Am I becoming more consistent over time?**

The application is designed not just to track tasks, but to help users **build the habit of learning consistently.**

---

# 📜 License

License information will be added before the first production release.

---

## 👨‍💻 Author

**Chiranjeevi N**

Built as a full-stack software engineering project focused on:

* Software development
* System design
* Backend engineering
* Frontend engineering
* Database design
* Testing
* AI integration
* Production deployment
