import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Standard middlewares
app.use(cors({
  origin: true, // Allow all origins for local dev or customize as needed
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
