# 🚀 StudyStreak — Production Deployment & Operations Specification

This document provides complete instructions for deploying, operating, maintaining, and troubleshooting StudyStreak in a production environment.

---

## 1. System Architecture & Topology

```text
                                Internet
                                   │
                   ┌───────────────┴───────────────┐
                   │   HTTPS / Domain SSL Router   │
                   └───────────────┬───────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         │                                                   │
         ▼                                                   ▼
 ┌───────────────┐                                   ┌───────────────┐
 │ React/Vite SPA│                                   │ Express API   │
 │ Frontend Host │                                   │ Backend Host  │
 └───────────────┘                                   └───────┬───────┘
         │                                                   │
         │ REST API Requests (HTTP-Only Credentials Cookie)  │
         └─────────────────────────┬─────────────────────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │   Managed DB      │
                         │ PostgreSQL 16 DB  │
                         └───────────────────┘
```

---

## 2. Production Environment Variable Reference

### Backend Environment Variables (`backend/.env` or Host Settings)
| Variable Name | Required | Default / Format | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Yes | `5000` | HTTP Port for Express Server listener |
| `NODE_ENV` | Yes | `production` | Enables production optimisations and log masking |
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/db?sslmode=require` | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Cryptographic Random String (≥32 chars) | Secret key for signing session tokens |
| `FRONTEND_URL` | Yes | `https://studystreak.app` | Production frontend domain for CORS whitelist |

### Frontend Environment Variables (`frontend/.env.production` or Host Settings)
| Variable Name | Required | Default / Format | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Optional | `https://api.studystreak.app` | Backend API base URL (defaults to relative or localhost in dev) |

> ⚠️ **CRITICAL SECURITY NOTE**: Never commit real database credentials or secret keys to source control!

---

## 3. Database Setup & Safe Migrations

### Managed PostgreSQL Setup
1. Provision a PostgreSQL 16 instance on your managed provider (e.g. Supabase, Railway, Neon, AWS RDS, GCP Cloud SQL).
2. Ensure SSL connection is required (`sslmode=require`).

### Applying Migrations safely in Production
Do **NOT** run `npx prisma migrate dev` in production. Always execute:
```bash
npx prisma migrate deploy --schema=backend/prisma/schema.prisma
```
This safely applies all pending versioned migrations without modifying existing data or generating dev lock files.

### Idempotent Seeding
Apply achievement definitions and initial configuration data:
```bash
npm run db:seed -w backend
```
> The seed script uses `upsert({ where: { code } })`, making it 100% idempotent and safe to run multiple times without duplicating data.

---

## 4. Hosting Platform Deployment Guides

### Option A: Render / Railway Deployment (Recommended)
1. **Database Service**: Create a Managed PostgreSQL 16 database. Copy the connection string into `DATABASE_URL`.
2. **Backend Service**:
   - Environment: `Node`
   - Build Command: `npm install && npx prisma generate --schema=backend/prisma/schema.prisma && npm run build -w backend`
   - Start Command: `npx prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/server.js`
   - Health Check Path: `/health`
3. **Frontend Service**:
   - Environment: `Static Site` (or Vercel / Netlify)
   - Build Command: `npm install && npm run build -w frontend`
   - Publish Directory: `frontend/dist`
   - Environment Variables: Set `VITE_API_URL` to your backend URL (`https://api.studystreak.app`).
   - Rewrite Rule: Redirect `/*` to `/index.html` (200 Rewrite) for SPA Client-Side Routing.

### Option B: Docker Container Deployment
Deploy using Docker Compose:
```bash
# Build and start PostgreSQL + Express Backend containers
docker-compose up -d --build
```
Verify container status:
```bash
docker-compose ps
curl http://localhost:5000/ready
```

---

## 5. Security & Authentication Checks

- **HTTPS**: Both Frontend and Backend MUST be served over HTTPS.
- **Cookies**: Session JWT cookies are marked `HttpOnly`, `SameSite=Strict`, and `Secure` (over HTTPS).
- **CORS**: Verified strictly against `FRONTEND_URL`.
- **IDOR Defense**: All API controllers verify user ownership (`where: { id, userId }`) on every mutation and query.

---

## 6. Health & Readiness Monitoring

- **Health Probe**: `GET /health` -> Returns `200 OK` `{ "status": "ok", "timestamp": "..." }`.
- **Readiness Probe**: `GET /ready` -> Executes `SELECT 1` ping against PostgreSQL database. Returns `200 OK` when connected, or `503 Service Unavailable` if database is unreachable.

---

## 7. CI/CD Integration

The repository includes a GitHub Actions automated CI workflow ([.github/workflows/ci.yml](file:///d:/projects/Study-Streak/.github/workflows/ci.yml)):
- Automatically runs on `push` and `pull_request` to `main`.
- Provisions clean PostgreSQL 16 service container.
- Runs `npm ci`, Prisma generation, and `npm run check` (Linting, Typechecking, 117 Unit/Integration Tests, and Vite/TSC Builds).

---

## 8. Production Verification Protocol & Checklist

```text
[x] Environment variables configured in host manager
[x] Managed PostgreSQL 16 database created with SSL
[x] Database migrations applied (`npx prisma migrate deploy`)
[x] Idempotent achievement seed applied (`npm run db:seed`)
[x] Backend API deployed and health check responding (`/health`)
[x] Frontend SPA deployed with SPA rewrite rules (`/*` -> `index.html`)
[x] HTTPS enforced on both frontend and backend
[x] CORS configured for production frontend origin
[x] Authentication (Register/Login/Logout) tested with HTTP-Only cookies
[x] Core user flow (Plan -> Tasks -> Streak -> Calendar -> Reflection -> Analytics -> Achievements -> Notifications -> Settings) verified
[x] User Data Isolation verified (User A cannot access User B data)
[x] Zero secrets committed to source control
```

---

## 9. Rollback & Troubleshooting Guide

### Reverting Application Code
If a production deployment requires rollback:
1. Identify the last known stable Git commit hash (`git log --oneline -10`).
2. Trigger redelivery or git push of the stable commit to `main`.

### Database Rollback Considerations
- Schema changes in Prisma migrations are forward-only by default.
- If a migration added non-breaking columns, rolling back application code to the prior commit will continue functioning safely.
- Never run destructive `prisma db push --force-reset` commands against a live production database!

### Common Operational Issues
- **404 on Page Refresh**: Verify SPA fallback rewrite rule (`/*` -> `/index.html`) is active on frontend hosting platform.
- **503 Database Error on `/ready`**: Verify PostgreSQL instance is active and `DATABASE_URL` credentials & SSL mode are valid.
- **CORS Rejected**: Verify `FRONTEND_URL` matches exact frontend origin including scheme (`https://`).
