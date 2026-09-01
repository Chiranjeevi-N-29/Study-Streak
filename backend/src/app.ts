import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import studyPlanRoutes from './modules/study-plan/study-plan.routes.js';
import studyTaskRoutes from './modules/study-task/study-task.routes.js';
import streakRoutes from './modules/streak/streak.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import achievementRoutes from './modules/achievement/achievement.routes.js';
import notificationRoutes from './modules/notification/notification.routes.js';

const app = express();

// Standard middlewares
app.use(cors({
  origin: true, // Allow all origins for local dev or customize as needed
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    message: 'StudyStreak API is running successfully',
    timestamp: new Date().toISOString()
  });
});

// Register global error handler
app.use(errorHandler);

export default app;
