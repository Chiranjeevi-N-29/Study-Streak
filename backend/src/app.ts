import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';

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
