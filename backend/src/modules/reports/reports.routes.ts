import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth.js';
import { handleGetReport, handleExport } from './reports.controller.js';
import { config } from '../../config/index.js';

const router = Router();

// Stricter rate limit for export — file generation is heavier
const exportRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many export requests. Please wait 15 minutes before trying again.',
    },
  },
  skip: () => config.nodeEnv === 'test',
});

// GET /api/reports?range=30d
router.get('/reports', requireAuth, handleGetReport);

// GET /api/reports/export?format=json&dataset=all&range=all
router.get('/reports/export', requireAuth, exportRateLimiter, handleExport);

export default router;
