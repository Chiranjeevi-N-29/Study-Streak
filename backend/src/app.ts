import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { prisma } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import authRoutes from './modules/auth/auth.routes.js';
import studyPlanRoutes from './modules/study-plan/study-plan.routes.js';
import studyTaskRoutes from './modules/study-task/study-task.routes.js';
import streakRoutes from './modules/streak/streak.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import achievementRoutes from './modules/achievement/achievement.routes.js';
import notificationRoutes from './modules/notification/notification.routes.js';

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for API server flexibility
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Request Correlation ID Middleware
app.use(requestIdMiddleware);

// CORS configuration
const corsOrigin =
  config.nodeEnv === 'production'
    ? config.frontendUrl
    : true;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate Limiting (Skip during automated tests)
const isTestEnv = config.nodeEnv === 'test';

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
  },
  skip: () => isTestEnv,
});

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down.',
    },
  },
  skip: () => isTestEnv,
});

// Apply rate limiting
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api', apiRateLimiter);

// Auth Routes
app.use('/api/auth', authRoutes);

// Study Plan, Task, Streak, Analytics, Achievement, and Notification Routes
app.use('/api/study-plans', studyPlanRoutes);
app.use('/api/tasks', studyTaskRoutes);
app.use('/api/streak', streakRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', analyticsRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    message: 'StudyStreak API is running successfully',
    timestamp: new Date().toISOString(),
  });
});

// Readiness Check Endpoint (Verifies Database Connection)
app.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// Register global error handler
app.use(errorHandler);

export default app;
